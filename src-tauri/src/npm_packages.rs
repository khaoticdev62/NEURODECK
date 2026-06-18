//! NEURODECK npm Package Manager
//!
//! Manages user-installed npm feature tools (LSP servers, formatters, linters,
//! utilities) in an isolated prefix under the OS config directory. These tools
//! are exposed to NEURODECK features (Terminal, IDE, Canvas, Agent) via a
//! runtime PATH overlay without modifying the application's own node_modules or
//! the host's global npm installation.

use std::path::{Path, PathBuf};
use std::process::Stdio;

use regex::Regex;
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

use crate::bridge::WsBroadcaster;
use crate::paths::user_config_dir;

lazy_static::lazy_static! {
    /// Validates npm package names (with optional scope).
    /// Matches npm's documented naming rules:
    /// - Lowercase a-z, 0-9, hyphen, underscore, tilde, period.
    /// - No leading dot or underscore.
    /// - Max length enforced separately.
    static ref PACKAGE_NAME_RE: Regex = Regex::new(
        r"^(?:@([a-z0-9-~][a-z0-9-._~]*)/)?([a-z0-9-~][a-z0-9-._~]*)$"
    ).unwrap();
}

const MAX_PACKAGE_NAME_LEN: usize = 214;
const INSTALL_TIMEOUT_SECS: u64 = 300;
const NPM_PROGRESS_EVENT: &str = "npm_install_progress";

/// Status of the host Node.js / npm environment.
#[derive(Debug, Clone, Serialize)]
pub struct NpmStatus {
    pub node: bool,
    pub npm: bool,
    pub node_version: Option<String>,
    pub npm_version: Option<String>,
}

/// A managed npm package entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedPackage {
    pub name: String,
    pub version_constraint: Option<String>,
    pub installed_version: Option<String>,
    pub enabled: bool,
    pub category: Option<String>,
    pub source: Option<String>,
}

/// Progress payload emitted over WebSocket during install/update.
#[derive(Debug, Clone, Serialize)]
pub struct InstallProgress {
    pub name: String,
    pub state: String, // "downloading" | "installing" | "verifying" | "completed" | "failed"
    pub percent: Option<u32>,
    pub details: Option<String>,
    pub error: Option<String>,
}

/// Recommended package exposed to onboarding.
#[derive(Debug, Clone, Serialize)]
pub struct RecommendedPackage {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub default_selected: bool,
}

/// Returns the isolated npm prefix directory.
pub fn npm_prefix_dir() -> PathBuf {
    user_config_dir().join("npm")
}

/// Returns the `.bin` directory inside the isolated prefix.
pub fn npm_bin_dir() -> PathBuf {
    npm_prefix_dir().join("node_modules").join(".bin")
}

/// Returns the path to the user package manifest.
pub fn npm_manifest_path() -> PathBuf {
    npm_prefix_dir().join("packages.json")
}

/// Ensures the npm prefix directory exists.
pub fn ensure_npm_prefix() -> Result<(), String> {
    let dir = npm_prefix_dir();
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create npm prefix {}: {}", dir.display(), e))?;
    Ok(())
}

/// Validates a package name and returns an error if unsafe.
pub fn validate_package_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Package name cannot be empty".to_string());
    }
    if name.len() > MAX_PACKAGE_NAME_LEN {
        return Err(format!(
            "Package name exceeds maximum length of {}",
            MAX_PACKAGE_NAME_LEN
        ));
    }
    if !PACKAGE_NAME_RE.is_match(name) {
        return Err(format!(
            "Invalid package name '{}'. Only npm-safe characters are allowed.",
            name
        ));
    }
    Ok(())
}

/// Detect Node.js and npm on the host PATH.
pub async fn get_npm_status() -> NpmStatus {
    let node = detect_binary_version("node", &["--version"]).await;
    let npm = detect_binary_version(
        if cfg!(target_os = "windows") {
            "npm.cmd"
        } else {
            "npm"
        },
        &["--version"],
    )
    .await;

    NpmStatus {
        node: node.is_some(),
        npm: npm.is_some(),
        node_version: node,
        npm_version: npm,
    }
}

async fn detect_binary_version(binary: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(binary).args(args).output().await.ok()?;
    if !output.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

/// Read the user-managed package manifest.
pub fn read_manifest() -> Result<Vec<ManagedPackage>, String> {
    let path = npm_manifest_path();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read npm manifest: {}", e))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    let manifest: Vec<ManagedPackage> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse npm manifest: {}", e))?;
    Ok(manifest)
}

/// Write the user-managed package manifest atomically.
pub fn write_manifest(manifest: &[ManagedPackage]) -> Result<(), String> {
    ensure_npm_prefix()?;
    let path = npm_manifest_path();
    let tmp = path.with_extension("tmp");
    let json = serde_json::to_string_pretty(manifest)
        .map_err(|e| format!("Failed to serialize npm manifest: {}", e))?;
    std::fs::write(&tmp, json).map_err(|e| format!("Failed to write npm manifest: {}", e))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("Failed to finalize npm manifest: {}", e))?;
    Ok(())
}

/// List installed packages, verifying binary presence on disk.
pub fn list_packages() -> Result<Vec<ManagedPackage>, String> {
    let mut manifest = read_manifest()?;
    let bin_dir = npm_bin_dir();
    for pkg in &mut manifest {
        if pkg.installed_version.is_some() {
            // Mark as not installed if the package directory no longer exists.
            let pkg_dir = npm_prefix_dir()
                .join("node_modules")
                .join(strip_scope_prefix(&pkg.name));
            if !pkg_dir.exists() {
                pkg.installed_version = None;
            }
        }
    }
    // Also discover packages present on disk but missing from the manifest.
    if bin_dir.exists() {
        for entry in std::fs::read_dir(&bin_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with('.') {
                continue;
            }
            // Heuristic: binaries in .bin are usually symlinks to package bins.
            // We only auto-add if we can resolve them to a real package directory.
            if let Ok(meta) = std::fs::symlink_metadata(entry.path()) {
                if meta.file_type().is_symlink() {
                    if let Ok(target) = std::fs::read_link(entry.path()) {
                        if let Some(pkg_name) = infer_package_from_binary_path(&target) {
                            if !manifest.iter().any(|p| p.name == pkg_name) {
                                manifest.push(ManagedPackage {
                                    name: pkg_name,
                                    version_constraint: None,
                                    installed_version: Some("unknown".to_string()),
                                    enabled: true,
                                    category: None,
                                    source: Some("discovered".to_string()),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(manifest)
}

/// Install a package from the npm registry.
pub async fn install_package(
    name: String,
    version: Option<String>,
    broadcaster: Option<WsBroadcaster>,
) -> Result<ManagedPackage, String> {
    validate_package_name(&name)?;
    ensure_npm_prefix()?;

    emit_progress(
        &broadcaster,
        &name,
        "downloading",
        None,
        Some("Resolving package from registry".to_string()),
        None,
    );

    let npm = npm_binary();
    let spec = match &version {
        Some(v) if !v.is_empty() => format!("{}@{}", name, sanitize_version_constraint(v)?),
        _ => name.clone(),
    };

    let mut cmd = Command::new(&npm);
    cmd.arg("install")
        .arg("--prefix")
        .arg(npm_prefix_dir())
        .arg("--ignore-scripts")
        .arg("--no-fund")
        .arg("--no-audit")
        .arg("--loglevel")
        .arg("error")
        .arg(&spec)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn npm install: {}", e))?;

    emit_progress(
        &broadcaster,
        &name,
        "installing",
        Some(0),
        Some(format!("Running npm install {}", spec)),
        None,
    );

    let stdout = child.stdout.take().expect("stdout piped");
    let stderr = child.stderr.take().expect("stderr piped");

    let bc_stdout = broadcaster.clone();
    let name_stdout = name.clone();
    let stdout_task = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if !line.trim().is_empty() {
                emit_progress(
                    &bc_stdout,
                    &name_stdout,
                    "installing",
                    None,
                    Some(line),
                    None,
                );
            }
        }
    });

    let bc_stderr = broadcaster.clone();
    let name_stderr = name.clone();
    let stderr_task = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if !line.trim().is_empty() {
                emit_progress(
                    &bc_stderr,
                    &name_stderr,
                    "installing",
                    None,
                    Some(line),
                    None,
                );
            }
        }
    });

    let result = timeout(Duration::from_secs(INSTALL_TIMEOUT_SECS), child.wait()).await;
    let _ = stdout_task.await;
    let _ = stderr_task.await;

    let status = match result {
        Ok(Ok(status)) => status,
        Ok(Err(e)) => return Err(format!("npm install failed: {}", e)),
        Err(_) => return Err("npm install timed out after 5 minutes".to_string()),
    };

    if !status.success() {
        return Err(format!("npm install exited with code {:?}", status.code()));
    }

    let installed_version = read_installed_version(&name)?;

    let mut manifest = read_manifest()?;
    let entry = manifest.iter_mut().find(|p| p.name == name);
    if let Some(entry) = entry {
        entry.installed_version = installed_version.clone();
        entry.enabled = true;
    } else {
        manifest.push(ManagedPackage {
            name: name.clone(),
            version_constraint: version.clone(),
            installed_version: installed_version.clone(),
            enabled: true,
            category: None,
            source: Some("npm".to_string()),
        });
    }
    write_manifest(&manifest)?;

    emit_progress(
        &broadcaster,
        &name,
        "completed",
        Some(100),
        Some(format!(
            "Installed {} {}",
            name,
            installed_version.as_deref().unwrap_or("unknown")
        )),
        None,
    );

    Ok(ManagedPackage {
        name,
        version_constraint: version,
        installed_version,
        enabled: true,
        category: None,
        source: Some("npm".to_string()),
    })
}

/// Uninstall a managed package.
pub async fn uninstall_package(name: String) -> Result<(), String> {
    validate_package_name(&name)?;
    ensure_npm_prefix()?;

    let npm = npm_binary();
    let status = Command::new(&npm)
        .arg("uninstall")
        .arg("--prefix")
        .arg(npm_prefix_dir())
        .arg("--ignore-scripts")
        .arg("--loglevel")
        .arg("error")
        .arg(&name)
        .status()
        .await
        .map_err(|e| format!("Failed to spawn npm uninstall: {}", e))?;

    if !status.success() {
        return Err(format!(
            "npm uninstall exited with code {:?}",
            status.code()
        ));
    }

    let mut manifest = read_manifest()?;
    manifest.retain(|p| p.name != name);
    write_manifest(&manifest)?;
    Ok(())
}

/// Update a managed package to the latest matching version.
pub async fn update_package(
    name: String,
    broadcaster: Option<WsBroadcaster>,
) -> Result<ManagedPackage, String> {
    validate_package_name(&name)?;
    ensure_npm_prefix()?;

    let npm = npm_binary();
    let status = Command::new(&npm)
        .arg("update")
        .arg("--prefix")
        .arg(npm_prefix_dir())
        .arg("--ignore-scripts")
        .arg("--no-fund")
        .arg("--no-audit")
        .arg("--loglevel")
        .arg("error")
        .arg(&name)
        .status()
        .await
        .map_err(|e| format!("Failed to spawn npm update: {}", e))?;

    if !status.success() {
        return Err(format!("npm update exited with code {:?}", status.code()));
    }

    let installed_version = read_installed_version(&name)?;
    let mut manifest = read_manifest()?;
    let entry = manifest.iter_mut().find(|p| p.name == name);
    if let Some(entry) = entry {
        entry.installed_version = installed_version.clone();
    }
    write_manifest(&manifest)?;

    emit_progress(
        &broadcaster,
        &name,
        "completed",
        Some(100),
        Some(format!(
            "Updated {} {}",
            name,
            installed_version.as_deref().unwrap_or("unknown")
        )),
        None,
    );

    Ok(ManagedPackage {
        name,
        version_constraint: None,
        installed_version,
        enabled: true,
        category: None,
        source: Some("npm".to_string()),
    })
}

/// Resolve the absolute path to a binary inside the managed npm `.bin`.
pub fn resolve_binary_path(binary: &str) -> Result<Option<String>, String> {
    let bin_dir = npm_bin_dir();
    let candidate = bin_dir.join(binary);
    if candidate.exists() {
        return Ok(Some(candidate.to_string_lossy().to_string()));
    }
    // On Windows, npm may create `.cmd` wrappers.
    #[cfg(target_os = "windows")]
    {
        let with_ext = bin_dir.join(format!("{}.cmd", binary));
        if with_ext.exists() {
            return Ok(Some(with_ext.to_string_lossy().to_string()));
        }
        let with_ps1 = bin_dir.join(format!("{}.ps1", binary));
        if with_ps1.exists() {
            return Ok(Some(with_ps1.to_string_lossy().to_string()));
        }
    }
    Ok(None)
}

/// Return the curated list of recommended npm packages for onboarding.
pub fn get_recommended_packages() -> Vec<RecommendedPackage> {
    vec![
        RecommendedPackage {
            id: "typescript-language-server".to_string(),
            name: "typescript-language-server".to_string(),
            description: "Language server for TypeScript and JavaScript.".to_string(),
            category: "LSP".to_string(),
            default_selected: true,
        },
        RecommendedPackage {
            id: "prettier".to_string(),
            name: "prettier".to_string(),
            description: "Opinionated code formatter.".to_string(),
            category: "Formatter".to_string(),
            default_selected: true,
        },
        RecommendedPackage {
            id: "eslint".to_string(),
            name: "eslint".to_string(),
            description: "Pluggable JavaScript/TypeScript linter.".to_string(),
            category: "Linter".to_string(),
            default_selected: false,
        },
        RecommendedPackage {
            id: "nodemon".to_string(),
            name: "nodemon".to_string(),
            description: "Auto-restart node applications during development.".to_string(),
            category: "Utility".to_string(),
            default_selected: false,
        },
    ]
}

/// Returns the PATH segment that should be prepended to subprocess environments.
pub fn npm_path_prefix() -> Option<String> {
    let bin_dir = npm_bin_dir();
    if bin_dir.exists() {
        Some(bin_dir.to_string_lossy().to_string())
    } else {
        None
    }
}

fn npm_binary() -> String {
    if cfg!(target_os = "windows") {
        "npm.cmd".to_string()
    } else {
        "npm".to_string()
    }
}

fn sanitize_version_constraint(v: &str) -> Result<String, String> {
    // Allow simple semver ranges: 1.2.3, ^1.2.3, ~1.2.3, >=1.2.3, latest, etc.
    let allowed =
        Regex::new(r"^[a-zA-Z0-9._~^>=<\-*]+$").map_err(|e| format!("Regex error: {}", e))?;
    if !allowed.is_match(v) {
        return Err(format!("Invalid version constraint '{}'", v));
    }
    Ok(v.to_string())
}

fn strip_scope_prefix(name: &str) -> String {
    if let Some(idx) = name.find('/') {
        name[idx + 1..].to_string()
    } else {
        name.to_string()
    }
}

fn read_installed_version(name: &str) -> Result<Option<String>, String> {
    let pkg_dir = npm_prefix_dir()
        .join("node_modules")
        .join(strip_scope_prefix(name));
    let package_json = pkg_dir.join("package.json");
    if !package_json.exists() {
        return Ok(None);
    }
    let content = std::fs::read_to_string(&package_json)
        .map_err(|e| format!("Failed to read package.json for {}: {}", name, e))?;
    let parsed: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse package.json for {}: {}", name, e))?;
    Ok(parsed
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string()))
}

fn infer_package_from_binary_path(target: &Path) -> Option<String> {
    // npm .bin symlinks typically point to ../<package>/bin/<binary>
    // Walk up to find package.json and read its name.
    let mut current = target.parent()?;
    for _ in 0..5 {
        let candidate = current.join("package.json");
        if candidate.exists() {
            if let Ok(content) = std::fs::read_to_string(&candidate) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(name) = parsed.get("name").and_then(|v| v.as_str()) {
                        return Some(name.to_string());
                    }
                }
            }
        }
        current = current.parent()?;
    }
    None
}

fn emit_progress(
    broadcaster: &Option<WsBroadcaster>,
    name: &str,
    state: &str,
    percent: Option<u32>,
    details: Option<String>,
    error: Option<String>,
) {
    if let Some(bc) = broadcaster {
        bc.emit(
            NPM_PROGRESS_EVENT,
            InstallProgress {
                name: name.to_string(),
                state: state.to_string(),
                percent,
                details,
                error,
            },
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_safe_package_names() {
        assert!(validate_package_name("lodash").is_ok());
        assert!(validate_package_name("@types/node").is_ok());
        assert!(validate_package_name("typescript-language-server").is_ok());
    }

    #[test]
    fn rejects_unsafe_package_names() {
        assert!(validate_package_name("").is_err());
        assert!(validate_package_name("foo; rm -rf /").is_err());
        assert!(validate_package_name("../escape").is_err());
        assert!(validate_package_name("@evil/..").is_err());
    }

    #[test]
    fn version_sanitization_allows_simple_ranges() {
        assert_eq!(sanitize_version_constraint("^1.2.3").unwrap(), "^1.2.3");
        assert_eq!(sanitize_version_constraint("latest").unwrap(), "latest");
        assert!(sanitize_version_constraint("1.2; echo hi").is_err());
    }

    #[test]
    fn strip_scope_works() {
        assert_eq!(strip_scope_prefix("@types/node"), "node");
        assert_eq!(strip_scope_prefix("prettier"), "prettier");
    }
}

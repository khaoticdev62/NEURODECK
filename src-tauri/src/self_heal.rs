use crate::config;
use crate::memory::MemoryDB;
use crate::CustomPersona;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const RUNTIME_DIRS: &[&str] = &[
    "bin",
    "data",
    "data/memory",
    "data/profiles",
    "data/themes",
    "data/torrents",
    "data/torrents/downloads",
    "logs",
    "plugins",
    "scripts",
];

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SelfHealReport {
    pub status: String,
    pub recovered_count: usize,
    pub warning_count: usize,
    pub actions: Vec<String>,
}

impl SelfHealReport {
    pub fn healthy() -> Self {
        Self {
            status: "healthy".to_string(),
            recovered_count: 0,
            warning_count: 0,
            actions: Vec::new(),
        }
    }

    fn recovered(&mut self, message: impl Into<String>) {
        self.recovered_count += 1;
        self.actions.push(message.into());
        self.refresh_status();
    }

    fn warning(&mut self, message: impl Into<String>) {
        self.warning_count += 1;
        self.actions.push(message.into());
        self.refresh_status();
    }

    fn refresh_status(&mut self) {
        self.status = if self.warning_count > 0 {
            "degraded".to_string()
        } else if self.recovered_count > 0 {
            "recovered".to_string()
        } else {
            "healthy".to_string()
        };
    }

    pub fn summary(&self) -> String {
        if self.actions.is_empty() {
            return "Startup health check passed.".to_string();
        }
        self.actions.join(" | ")
    }
}

pub struct BootSelfHealOutcome {
    pub config: config::Config,
    pub custom_personas: Vec<CustomPersona>,
    pub mem_db: Option<MemoryDB>,
    pub report: SelfHealReport,
}

pub fn boot_self_heal(config_root: &Path, config_path: &Path) -> BootSelfHealOutcome {
    let mut report = SelfHealReport::healthy();
    ensure_runtime_layout(config_root, &mut report);

    let mut config = heal_config(config_path, &mut report);
    sanitize_config(&mut config, &mut report);
    let custom_personas =
        heal_custom_personas(&config_root.join("data").join("personas.json"), &mut report);
    let mem_db = init_memory_with_recovery(&config_root.join("data").join("memory"), &mut report);

    BootSelfHealOutcome {
        config,
        custom_personas,
        mem_db,
        report,
    }
}

pub fn maintain_runtime_layout(config_root: &Path) {
    let mut report = SelfHealReport::healthy();
    ensure_runtime_layout(config_root, &mut report);
}

fn ensure_runtime_layout(config_root: &Path, report: &mut SelfHealReport) {
    if fs::create_dir_all(config_root).is_ok() {
        for rel in RUNTIME_DIRS {
            let dir = config_root.join(rel);
            if !dir.exists() {
                match fs::create_dir_all(&dir) {
                    Ok(_) => report.recovered(format!(
                        "Created missing runtime directory: {}",
                        dir.display()
                    )),
                    Err(err) => report.warning(format!(
                        "Failed to create runtime directory {}: {}",
                        dir.display(),
                        err
                    )),
                }
            }
        }
    } else {
        report.warning(format!(
            "Failed to create config root: {}",
            config_root.display()
        ));
    }

    let env_path = config_root.join("env");
    if !env_path.exists() {
        match fs::write(&env_path, "") {
            Ok(_) => report.recovered(format!("Created missing env file: {}", env_path.display())),
            Err(err) => report.warning(format!(
                "Failed to create env file {}: {}",
                env_path.display(),
                err
            )),
        }
    }

    let bin_readme = config_root.join("bin").join("README.txt");
    if !bin_readme.exists() {
        let readme_content = "NEURODECK PORTABLE BINARY DIRECTORY\n\
                              ===================================\n\n\
                              This directory is added to your terminal environment PATH on startup.\n\
                              Any executable binary, script loader, or custom command wrapper placed\n\
                              here will be immediately callable inside:\n\
                              - The PTY terminal tabs\n\
                              - The Canvas Python/Bash run executors\n\
                              - Autonomous Agent scripting loops\n\n\
                              Suggested tools to place here:\n\
                              - static-linked micro text editor (micro)\n\
                              - ripgrep (rg)\n\
                              - fuzzy finder (fzf)\n\
                              - bat (syntax cat)\n";
        let _ = fs::write(&bin_readme, readme_content);
    }
}

fn heal_config(config_path: &Path, report: &mut SelfHealReport) -> config::Config {
    if !config_path.exists() {
        let cfg = config::Config::default();
        match persist_config(config_path, &cfg) {
            Ok(_) => report.recovered(format!("Created default config: {}", config_path.display())),
            Err(err) => report.warning(format!(
                "Failed to write default config {}: {}",
                config_path.display(),
                err
            )),
        }
        return cfg;
    }

    let content = match fs::read_to_string(config_path) {
        Ok(content) => content,
        Err(err) => {
            report.warning(format!(
                "Failed to read config {}: {}",
                config_path.display(),
                err
            ));
            return config::Config::default();
        }
    };

    match toml::from_str::<config::Config>(&content) {
        Ok(_) => config::load_config(config_path),
        Err(err) => {
            backup_corrupt_file(config_path, report, "config");
            let cfg = config::Config::default();
            match persist_config(config_path, &cfg) {
                Ok(_) => report.recovered(format!(
                    "Rebuilt invalid config after parse failure: {}",
                    err
                )),
                Err(save_err) => report.warning(format!(
                    "Failed to rebuild invalid config {}: {}",
                    config_path.display(),
                    save_err
                )),
            }
            cfg
        }
    }
}

fn sanitize_config(config: &mut config::Config, report: &mut SelfHealReport) {
    let mut changed = false;

    if config.llm.default_provider != "gemini"
        && config.llm.default_provider != "ollama"
        && config.llm.default_provider != "huggingface"
        && config.llm.default_provider != "kimi"
    {
        config.llm.default_provider = "ollama".to_string();
        changed = true;
        report.recovered("Reset invalid LLM provider to ollama.");
    }
    if config.llm.ollama_model.trim().is_empty() {
        config.llm.ollama_model = "llama2".to_string();
        changed = true;
        report.recovered("Restored missing Ollama model to default.");
    }
    if config.llm.gemini_model.trim().is_empty() {
        config.llm.gemini_model = "gemini-1.5-flash".to_string();
        changed = true;
        report.recovered("Restored missing Gemini model to default.");
    }
    if config.llm.kimi_model.trim().is_empty() {
        config.llm.kimi_model = "kimi-k2.5".to_string();
        changed = true;
        report.recovered("Restored missing Kimi model to default.");
    }
    if config.llm.kimi_base_url.trim().is_empty() {
        config.llm.kimi_base_url = "https://api.moonshot.ai/v1".to_string();
        changed = true;
        report.recovered("Restored missing Kimi base URL.");
    }
    if config.llm.ollama_base_url.trim().is_empty() {
        config.llm.ollama_base_url = "http://localhost:11434".to_string();
        changed = true;
        report.recovered("Restored missing Ollama base URL.");
    }
    if config.sync.device_id.trim().is_empty() {
        config.sync.device_id = uuid::Uuid::new_v4().to_string();
        changed = true;
        report.recovered("Regenerated missing sync device ID.");
    }
    if !config.stt.whisper_binary.trim().is_empty() && !binary_available(&config.stt.whisper_binary)
    {
        config.stt.whisper_binary.clear();
        changed = true;
        report.recovered("Cleared invalid whisper binary path.");
    }
    if !config.stt.whisper_model.trim().is_empty() && !Path::new(&config.stt.whisper_model).exists()
    {
        config.stt.whisper_model.clear();
        changed = true;
        report.recovered("Cleared invalid whisper model path.");
    }

    if changed {
        let config_path = crate::get_config_path();
        if let Err(err) = persist_config(&config_path, config) {
            report.warning(format!(
                "Failed to persist healed config {}: {}",
                config_path.display(),
                err
            ));
        }
    }
}

fn heal_custom_personas(path: &Path, report: &mut SelfHealReport) -> Vec<CustomPersona> {
    if !path.exists() {
        match fs::write(path, "[]") {
            Ok(_) => report.recovered(format!(
                "Created missing personas registry: {}",
                path.display()
            )),
            Err(err) => report.warning(format!(
                "Failed to create personas registry {}: {}",
                path.display(),
                err
            )),
        }
        return Vec::new();
    }

    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(err) => {
            report.warning(format!(
                "Failed to read personas registry {}: {}",
                path.display(),
                err
            ));
            return Vec::new();
        }
    };

    match serde_json::from_str::<Vec<CustomPersona>>(&content) {
        Ok(personas) => personas,
        Err(_) => {
            backup_corrupt_file(path, report, "personas");
            match fs::write(path, "[]") {
                Ok(_) => report.recovered("Reset corrupt personas registry to an empty list."),
                Err(err) => report.warning(format!(
                    "Failed to reset personas registry {}: {}",
                    path.display(),
                    err
                )),
            }
            Vec::new()
        }
    }
}

fn init_memory_with_recovery(memory_dir: &Path, report: &mut SelfHealReport) -> Option<MemoryDB> {
    let _ = fs::create_dir_all(memory_dir);
    match MemoryDB::init(memory_dir) {
        Ok(db) => Some(db),
        Err(err) => {
            report.warning(format!(
                "Memory database failed to open on first attempt: {}",
                err
            ));
            let backup = sibling_backup_path(memory_dir, "memory-corrupt");
            if memory_dir.exists() {
                let _ = fs::rename(memory_dir, &backup);
            }
            if let Err(create_err) = fs::create_dir_all(memory_dir) {
                report.warning(format!(
                    "Failed to recreate memory directory {}: {}",
                    memory_dir.display(),
                    create_err
                ));
                return None;
            }
            match MemoryDB::init(memory_dir) {
                Ok(db) => {
                    report.recovered(format!(
                        "Recovered memory database by isolating prior data at {}.",
                        backup.display()
                    ));
                    Some(db)
                }
                Err(retry_err) => {
                    report.warning(format!("Memory database recovery failed: {}", retry_err));
                    None
                }
            }
        }
    }
}

fn persist_config(path: &Path, config: &config::Config) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    config::save_config(path, config)
}

fn backup_corrupt_file(path: &Path, report: &mut SelfHealReport, label: &str) {
    let backup = sibling_backup_path(path, label);
    match fs::rename(path, &backup) {
        Ok(_) => report.recovered(format!(
            "Backed up corrupt {} to {}.",
            label,
            backup.display()
        )),
        Err(err) => report.warning(format!(
            "Failed to back up corrupt {} {}: {}",
            label,
            path.display(),
            err
        )),
    }
}

fn sibling_backup_path(path: &Path, label: &str) -> PathBuf {
    let stem = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(label);
    let ts = Utc::now().format("%Y%m%d%H%M%S");
    path.with_file_name(format!("{}.{}.{}", stem, label, ts))
}

fn binary_available(binary: &str) -> bool {
    let candidate = Path::new(binary);
    if candidate.exists() {
        return true;
    }
    let Some(paths) = env::var_os("PATH") else {
        return false;
    };
    env::split_paths(&paths).any(|dir| {
        let direct = dir.join(binary);
        if direct.exists() {
            return true;
        }
        #[cfg(target_os = "windows")]
        {
            dir.join(format!("{}.exe", binary)).exists()
        }
        #[cfg(not(target_os = "windows"))]
        {
            false
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("neurodeck-self-heal-{}-{}", name, nonce));
        let _ = fs::create_dir_all(&path);
        path
    }

    #[test]
    fn rebuilds_invalid_config_for_boot() {
        let root = temp_root("config");
        let config_path = root.join("llm-term.toml");
        fs::write(&config_path, "not = [valid").unwrap();

        let outcome = boot_self_heal(&root, &config_path);

        assert_eq!(outcome.config.llm.default_provider, "ollama");
        assert!(outcome.report.recovered_count >= 1);
        assert!(fs::read_to_string(&config_path)
            .unwrap()
            .contains("default_provider"));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn resets_invalid_persona_registry() {
        let root = temp_root("personas");
        let data_dir = root.join("data");
        fs::create_dir_all(&data_dir).unwrap();
        fs::write(
            root.join("llm-term.toml"),
            toml::to_string_pretty(&config::Config::default()).unwrap(),
        )
        .unwrap();
        fs::write(data_dir.join("personas.json"), "{bad json").unwrap();

        let outcome = boot_self_heal(&root, &root.join("llm-term.toml"));

        assert!(outcome.custom_personas.is_empty());
        assert!(outcome.report.recovered_count >= 1);
        assert_eq!(
            fs::read_to_string(data_dir.join("personas.json")).unwrap(),
            "[]"
        );

        let _ = fs::remove_dir_all(root);
    }
}

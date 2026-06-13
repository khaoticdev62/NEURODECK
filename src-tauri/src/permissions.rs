//! # Agent Permission Registry
//!
//! Central capability/permission service for agents, workflows, and plugins.
//! Deny-by-default model with named permission profiles.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

// ──────────────────────────────────────────────────────────────────────────
// Capability
// ──────────────────────────────────────────────────────────────────────────

/// A capability that can be granted to an agent, workflow, or plugin.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    /// Execute shell/bash/python scripts via agent_exec_code / exec_code_stream.
    ShellExec,
    /// Read files outside the restricted workspace.
    FileSystemRead,
    /// Write files outside the restricted workspace.
    FileSystemWrite,
    /// Make HTTP requests to external APIs (LLM providers, etc.).
    Network,
    /// Use the headless browser (navigation, citation, save-to-memory).
    Browser,
    /// Desktop automation: mouse, keyboard, screenshot, OCR.
    Computer,
    /// Search and query the memory vector database.
    MemoryRead,
    /// Store new records into the memory vector database.
    MemoryWrite,
    /// Load and execute Lua plugins.
    PluginLoad,
}

impl Capability {
    /// Human-readable label for UI display.
    pub fn label(&self) -> &'static str {
        match self {
            Capability::ShellExec => "Shell Execution",
            Capability::FileSystemRead => "File System Read",
            Capability::FileSystemWrite => "File System Write",
            Capability::Network => "Network Access",
            Capability::Browser => "Browser Automation",
            Capability::Computer => "Computer Automation",
            Capability::MemoryRead => "Memory Read",
            Capability::MemoryWrite => "Memory Write",
            Capability::PluginLoad => "Plugin Loading",
        }
    }

    /// Short description for tooltips.
    pub fn description(&self) -> &'static str {
        match self {
            Capability::ShellExec => "Run shell, Python, or Node.js code",
            Capability::FileSystemRead => "Read files outside the workspace",
            Capability::FileSystemWrite => "Write files outside the workspace",
            Capability::Network => "Call external APIs over the internet",
            Capability::Browser => "Navigate websites and extract content",
            Capability::Computer => "Control mouse, keyboard, and screen",
            Capability::MemoryRead => "Search past conversations and context",
            Capability::MemoryWrite => "Save new context to memory",
            Capability::PluginLoad => "Load and run Lua plugin scripts",
        }
    }

    /// All capabilities in a stable order (for UI rendering).
    pub fn all() -> &'static [Capability] {
        &[
            Capability::ShellExec,
            Capability::FileSystemRead,
            Capability::FileSystemWrite,
            Capability::Network,
            Capability::Browser,
            Capability::Computer,
            Capability::MemoryRead,
            Capability::MemoryWrite,
            Capability::PluginLoad,
        ]
    }
}

impl std::fmt::Display for Capability {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.label())
    }
}

// ──────────────────────────────────────────────────────────────────────────
// PermissionProfile
// ──────────────────────────────────────────────────────────────────────────

/// A named permission profile — a deny-by-default set of granted capabilities.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PermissionProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    /// Capabilities explicitly granted to this profile. Everything else is denied.
    #[serde(default)]
    pub granted: HashSet<Capability>,
    #[serde(default)]
    pub created_at: String,
}

impl PermissionProfile {
    /// Create a new profile with no granted capabilities.
    pub fn new(id: &str, name: &str) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: String::new(),
            granted: HashSet::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Grant a capability.
    pub fn grant(&mut self, cap: Capability) {
        self.granted.insert(cap);
    }

    /// Revoke a capability.
    pub fn revoke(&mut self, cap: Capability) {
        self.granted.remove(&cap);
    }

    /// Check if a capability is granted.
    pub fn can(&self, cap: Capability) -> bool {
        self.granted.contains(&cap)
    }
}

// ──────────────────────────────────────────────────────────────────────────
// PermissionRegistry
// ──────────────────────────────────────────────────────────────────────────

/// The permission registry — stores all profiles and provides enforcement.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PermissionRegistry {
    /// ID of the default profile applied to agents/workflows without an explicit profile.
    pub default_profile_id: String,
    /// All permission profiles.
    pub profiles: Vec<PermissionProfile>,
    /// Optional agent_id → profile_id overrides.
    #[serde(default)]
    pub agent_profile_map: HashMap<String, String>,
}

impl Default for PermissionRegistry {
    fn default() -> Self {
        let mut default = PermissionProfile::new("default", "Default");
        default.description = "Standard agent permissions".to_string();
        default.grant(Capability::ShellExec);
        default.grant(Capability::MemoryRead);
        default.grant(Capability::MemoryWrite);
        default.grant(Capability::Network);
        default.grant(Capability::Browser);
        default.grant(Capability::PluginLoad);

        let mut restricted = PermissionProfile::new("restricted", "Restricted");
        restricted.description = "Minimal permissions — memory read-only".to_string();
        restricted.grant(Capability::MemoryRead);

        let mut privileged = PermissionProfile::new("privileged", "Privileged");
        privileged.description = "Full system access".to_string();
        for cap in Capability::all() {
            privileged.grant(*cap);
        }

        Self {
            default_profile_id: "default".to_string(),
            profiles: vec![default, restricted, privileged],
            agent_profile_map: HashMap::new(),
        }
    }
}

impl PermissionRegistry {
    /// Look up a profile by ID. Returns `None` if not found.
    pub fn get(&self, id: &str) -> Option<&PermissionProfile> {
        self.profiles.iter().find(|p| p.id == id)
    }

    /// Mutable lookup by ID.
    pub fn get_mut(&mut self, id: &str) -> Option<&mut PermissionProfile> {
        self.profiles.iter_mut().find(|p| p.id == id)
    }

    /// Check if a profile (by ID) has a capability granted.
    /// Falls back to the default profile if the given ID is not found.
    pub fn can(&self, profile_id: &str, cap: Capability) -> bool {
        self.get(profile_id)
            .or_else(|| self.get(&self.default_profile_id))
            .map(|p| p.can(cap))
            .unwrap_or(false)
    }

    /// Get the effective profile for an agent ID.
    /// Falls back to the default profile if no explicit mapping exists.
    pub fn profile_for_agent(&self, agent_id: &str) -> &PermissionProfile {
        if let Some(profile_id) = self.agent_profile_map.get(agent_id) {
            if let Some(profile) = self.get(profile_id) {
                return profile;
            }
        }
        self.get(&self.default_profile_id)
            .or_else(|| self.profiles.first())
            .expect("PermissionRegistry always has at least one profile")
    }

    /// Map an agent to a permission profile. Pass `profile_id: null` to remove the mapping.
    pub fn set_agent_profile(
        &mut self,
        agent_id: &str,
        profile_id: Option<&str>,
    ) -> Result<(), String> {
        if let Some(id) = profile_id {
            if self.get(id).is_none() {
                return Err(format!("Permission profile '{}' does not exist", id));
            }
            self.agent_profile_map
                .insert(agent_id.to_string(), id.to_string());
        } else {
            self.agent_profile_map.remove(agent_id);
        }
        Ok(())
    }

    /// Add or update a profile. If a profile with the same ID exists, it is replaced.
    pub fn upsert(&mut self, profile: PermissionProfile) {
        if let Some(idx) = self.profiles.iter().position(|p| p.id == profile.id) {
            self.profiles[idx] = profile;
        } else {
            self.profiles.push(profile);
        }
    }

    /// Remove a profile by ID. Returns `Err` if the profile is the default.
    pub fn remove(&mut self, id: &str) -> Result<(), String> {
        if id == self.default_profile_id {
            return Err("Cannot delete the default permission profile".to_string());
        }
        let before = self.profiles.len();
        self.profiles.retain(|p| p.id != id);
        if self.profiles.len() == before {
            return Err(format!("Permission profile '{}' not found", id));
        }
        Ok(())
    }

    /// Set a new default profile ID. The profile must exist.
    pub fn set_default(&mut self, id: &str) -> Result<(), String> {
        if self.get(id).is_none() {
            return Err(format!("Profile '{}' does not exist", id));
        }
        self.default_profile_id = id.to_string();
        Ok(())
    }

    /// Validate the registry invariants.
    pub fn validate(&self) -> Result<(), String> {
        if self.profiles.is_empty() {
            return Err("PermissionRegistry must contain at least one profile".to_string());
        }
        if self.get(&self.default_profile_id).is_none() {
            return Err(format!(
                "Default profile '{}' does not exist in the registry",
                self.default_profile_id
            ));
        }
        Ok(())
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Enforcement helper
// ──────────────────────────────────────────────────────────────────────────

/// Require a capability for the active agent. Returns an error if denied.
pub fn require_capability(
    registry: &PermissionRegistry,
    agent_id: &str,
    cap: Capability,
) -> Result<(), String> {
    if registry.can(agent_id, cap) {
        Ok(())
    } else {
        Err(format!(
            "Permission denied: agent '{}' lacks '{}' capability",
            agent_id, cap
        ))
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_registry_has_profiles() {
        let reg = PermissionRegistry::default();
        assert!(!reg.profiles.is_empty());
        assert!(reg.get("default").is_some());
        assert!(reg.get("restricted").is_some());
        assert!(reg.get("privileged").is_some());
        assert_eq!(reg.default_profile_id, "default");
    }

    #[test]
    fn test_default_profile_has_expected_caps() {
        let reg = PermissionRegistry::default();
        let default = reg.get("default").unwrap();
        assert!(default.can(Capability::ShellExec));
        assert!(default.can(Capability::MemoryRead));
        assert!(default.can(Capability::MemoryWrite));
        assert!(default.can(Capability::Network));
        assert!(default.can(Capability::Browser));
        assert!(default.can(Capability::PluginLoad));
        assert!(!default.can(Capability::Computer));
        assert!(!default.can(Capability::FileSystemRead));
    }

    #[test]
    fn test_can_granted_capability() {
        let reg = PermissionRegistry::default();
        assert!(reg.can("default", Capability::ShellExec));
        assert!(reg.can("privileged", Capability::Computer));
        assert!(reg.can("privileged", Capability::PluginLoad));
    }

    #[test]
    fn test_can_denied_capability() {
        let reg = PermissionRegistry::default();
        assert!(!reg.can("restricted", Capability::ShellExec));
        assert!(!reg.can("default", Capability::Computer));
    }

    #[test]
    fn test_can_fallback_to_default() {
        let reg = PermissionRegistry::default();
        // Unknown agent ID falls back to default profile
        assert!(reg.can("unknown-agent", Capability::ShellExec));
        assert!(!reg.can("unknown-agent", Capability::Computer));
    }

    #[test]
    fn test_profile_for_agent_fallback() {
        let reg = PermissionRegistry::default();
        let p = reg.profile_for_agent("nonexistent");
        assert_eq!(p.id, "default");
    }

    #[test]
    fn test_profile_for_agent_mapping() {
        let mut reg = PermissionRegistry::default();
        reg.set_agent_profile("agent-alpha", Some("restricted"))
            .unwrap();
        let p = reg.profile_for_agent("agent-alpha");
        assert_eq!(p.id, "restricted");
        assert!(!p.can(Capability::ShellExec));

        reg.set_agent_profile("agent-alpha", None).unwrap();
        let p2 = reg.profile_for_agent("agent-alpha");
        assert_eq!(p2.id, "default");
    }

    #[test]
    fn test_set_agent_profile_missing_fails() {
        let mut reg = PermissionRegistry::default();
        let result = reg.set_agent_profile("agent-x", Some("ghost"));
        assert!(result.is_err());
    }

    #[test]
    fn test_upsert_create_and_update() {
        let mut reg = PermissionRegistry::default();
        let mut custom = PermissionProfile::new("custom", "Custom");
        custom.grant(Capability::Browser);
        reg.upsert(custom.clone());
        assert!(reg.get("custom").is_some());
        assert!(reg.can("custom", Capability::Browser));

        custom.grant(Capability::Computer);
        reg.upsert(custom);
        assert!(reg.can("custom", Capability::Computer));
    }

    #[test]
    fn test_cannot_delete_default_profile() {
        let mut reg = PermissionRegistry::default();
        let result = reg.remove("default");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot delete the default"));
    }

    #[test]
    fn test_remove_existing_profile() {
        let mut reg = PermissionRegistry::default();
        assert!(reg.get("restricted").is_some());
        reg.remove("restricted").unwrap();
        assert!(reg.get("restricted").is_none());
    }

    #[test]
    fn test_remove_unknown_profile_fails() {
        let mut reg = PermissionRegistry::default();
        let result = reg.remove("ghost");
        assert!(result.is_err());
    }

    #[test]
    fn test_set_default_valid() {
        let mut reg = PermissionRegistry::default();
        reg.set_default("restricted").unwrap();
        assert_eq!(reg.default_profile_id, "restricted");
    }

    #[test]
    fn test_set_default_invalid_fails() {
        let mut reg = PermissionRegistry::default();
        let result = reg.set_default("ghost");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_empty_registry_fails() {
        let reg = PermissionRegistry {
            default_profile_id: "default".to_string(),
            profiles: vec![],
            agent_profile_map: HashMap::new(),
        };
        assert!(reg.validate().is_err());
    }

    #[test]
    fn test_validate_missing_default_fails() {
        let reg = PermissionRegistry {
            default_profile_id: "missing".to_string(),
            profiles: vec![PermissionProfile::new("other", "Other")],
            agent_profile_map: HashMap::new(),
        };
        assert!(reg.validate().is_err());
    }

    #[test]
    fn test_require_capability_success() {
        let reg = PermissionRegistry::default();
        assert!(require_capability(&reg, "default", Capability::ShellExec).is_ok());
    }

    #[test]
    fn test_require_capability_failure() {
        let reg = PermissionRegistry::default();
        let result = require_capability(&reg, "default", Capability::Computer);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Permission denied"));
        assert!(err.contains("Computer Automation"));
    }

    #[test]
    fn test_capability_labels() {
        assert_eq!(Capability::ShellExec.label(), "Shell Execution");
        assert_eq!(Capability::Network.label(), "Network Access");
    }

    #[test]
    fn test_capability_all_count() {
        assert_eq!(Capability::all().len(), 9);
    }

    #[test]
    fn test_serde_round_trip() {
        let reg = PermissionRegistry::default();
        let json = serde_json::to_string(&reg).unwrap();
        let restored: PermissionRegistry = serde_json::from_str(&json).unwrap();
        assert_eq!(reg, restored);
    }
}

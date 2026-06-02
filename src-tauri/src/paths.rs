use std::path::PathBuf;

pub(crate) fn get_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").map(PathBuf::from).ok()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").map(PathBuf::from).ok()
    }
}

pub(crate) fn load_env_file() {
    if let Some(home) = get_home_dir() {
        let env_path = home.join(".config").join("neurodeck").join("env");
        if env_path.exists() {
            if let Ok(content) = std::fs::read_to_string(env_path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('#') {
                        continue;
                    }
                    if let Some((key, val)) = trimmed.split_once('=') {
                        let k = key.trim();
                        let v = val.trim().trim_matches('"').trim_matches('\'');
                        std::env::set_var(k, v);
                    }
                }
            }
        }
    }
}

pub(crate) fn get_config_path() -> PathBuf {
    // 1. Env override (highest priority — for dev/testing)
    if let Ok(env_path) = std::env::var("NEURODECK_CONFIG_PATH") {
        return PathBuf::from(env_path);
    }

    // 2. Primary: OS config directory (~/.config/neurodeck/llm-term.toml)
    let primary = user_config_dir().join("llm-term.toml");
    if primary.exists() {
        return primary;
    }

    // 3. Dev fallbacks (only when running under cargo)
    if std::env::var("CARGO_MANIFEST_DIR").is_ok() {
        let dev = PathBuf::from("../llm-term.toml");
        if dev.exists() {
            tracing::debug!("Using dev fallback config path: {}", dev.display());
            return dev;
        }
        let dev2 = PathBuf::from("./llm-term.toml");
        if dev2.exists() {
            return dev2;
        }
    }

    // 4. Legacy fallbacks for deployed binaries (deprecated)
    let legacy = PathBuf::from("../llm-term.toml");
    if legacy.exists() {
        tracing::warn!(
            "Using deprecated legacy config path: {}. Migrate to {} for persistence across updates.",
            legacy.display(),
            primary.display()
        );
        return legacy;
    }
    let legacy2 = PathBuf::from("./llm-term.toml");
    if legacy2.exists() {
        return legacy2;
    }

    // 5. Fresh install — primary path (heal_config will create a default)
    primary
}

pub(crate) fn user_config_dir() -> PathBuf {
    // Use the OS-conventional config directory so the path works correctly
    // on Windows (%APPDATA%), macOS (~/Library/Application Support), and
    // Linux/SteamOS (~/.config — XDG standard).
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            return PathBuf::from(appdata).join("neurodeck");
        }
        if let Ok(up) = std::env::var("USERPROFILE") {
            return PathBuf::from(up)
                .join("AppData")
                .join("Roaming")
                .join("neurodeck");
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("neurodeck");
        }
    }
    // Linux / SteamOS: XDG_CONFIG_HOME → ~/.config/neurodeck
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg).join("neurodeck");
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".config").join("neurodeck");
    }
    PathBuf::from(".")
}

pub(crate) fn user_bin_dir() -> PathBuf {
    // Keep shell tooling consistent across command execution and PTY sessions.
    // The runtime bin directory lives alongside the user config directory.
    user_config_dir().join("bin")
}

use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Returns the Steam library steamapps directories to scan, ordered by platform.
pub(crate) fn steam_library_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            for rel in &[
                ".steam/steam/steamapps",
                ".local/share/Steam/steamapps",
                "snap/steam/common/.local/share/Steam/steamapps",
            ] {
                let p = Path::new(&home).join(rel);
                if p.exists() {
                    paths.push(p);
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let candidates = [
            r"C:\Program Files (x86)\Steam\steamapps",
            r"C:\Program Files\Steam\steamapps",
        ];
        for c in &candidates {
            let p = PathBuf::from(c);
            if p.exists() {
                paths.push(p);
            }
        }
        if let Ok(pf) = std::env::var("PROGRAMFILES(X86)") {
            let p = Path::new(&pf).join(r"Steam\steamapps");
            if p.exists() && !paths.contains(&p) {
                paths.push(p);
            }
        }
    }

    paths
}

/// Parse a single appmanifest_*.acf file into (name, app_id, last_played).
pub(crate) fn parse_acf(path: &Path) -> Option<(String, String, u64)> {
    let content = std::fs::read_to_string(path).ok()?;
    let mut name = String::new();
    let mut app_id = String::new();
    let mut last_played: u64 = 0;

    for line in content.lines() {
        let parts: Vec<&str> = line.split('"').collect();
        if parts.len() < 4 {
            continue;
        }
        match parts[1] {
            "name" => name = parts[3].to_string(),
            "appid" => app_id = parts[3].to_string(),
            "LastPlayed" => last_played = parts[3].parse().unwrap_or(0),
            _ => {}
        }
    }

    if name.is_empty() {
        None
    } else {
        Some((name, app_id, last_played))
    }
}

/// Map of Steam AppID → known executable name (without extension).
/// Used for cross-platform process matching via sysinfo.
pub(crate) fn game_exe_map() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();
    map.insert("1091500", "Cyberpunk2077");
    map.insert("1174180", "RDR2");
    map.insert("1887720", "Hades2");
    map.insert("1145360", "Hades");
    map.insert("1245620", "eldenring");
    map.insert("730", "cs2");
    map.insert("440", "hl2");
    map.insert("570", "dota2");
    map.insert("292030", "witcher3");
    map.insert("374320", "DarkSoulsIII");
    map.insert("435150", "Divinity");
    map.insert("275850", "NoMansSky");
    map.insert("1086940", "BaldursGate3");
    map.insert("1282100", "RE4");
    map.insert("1817230", "HiFiRush");
    map.insert("1693980", "DeadSpace");
    map.insert("1593500", "GodofWar");
    map.insert("1449690", "TheLastofUsPartI");
    map.insert("2358720", "BlackMythWukong");
    map.insert("962130", "Grounded");
    map.insert("228970", "steam");
    map
}

/// On Linux, scan /proc for an actively running Steam game.
/// Checks cmdline, exe symlink, cwd, and comm against known game executables.
#[cfg(target_os = "linux")]
pub(crate) fn detect_running_game_linux() -> Option<(String, String)> {
    let proc_entries = std::fs::read_dir("/proc").ok()?;
    let exe_map = game_exe_map();

    for entry in proc_entries.flatten() {
        let fname = entry.file_name();
        let pid_str = fname.to_string_lossy();
        if !pid_str.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let proc_path = entry.path();

        // ── 1. cmdline check (original heuristic) ──
        let cmdline = match std::fs::read(proc_path.join("cmdline")) {
            Ok(b) => String::from_utf8_lossy(&b).replace('\0', " ").to_string(),
            Err(_) => String::new(),
        };
        let lower_cmdline = cmdline.to_lowercase();
        if lower_cmdline.contains("steam.sh") || lower_cmdline.contains("/steam ") {
            continue;
        }
        if let Some(start) = cmdline.find("steamapps/common/") {
            let rest = &cmdline[start + "steamapps/common/".len()..];
            let game_name = rest.split('/').next().unwrap_or("").trim().to_string();
            if !game_name.is_empty() {
                return Some((game_name, String::new()));
            }
        }

        // ── 2. exe symlink check (catches Proton/wine games) ──
        if let Ok(exe_link) = std::fs::read_link(proc_path.join("exe")) {
            let exe_str = exe_link.to_string_lossy().to_lowercase();
            if exe_str.contains("steamapps/common/") {
                if let Some(start) = exe_str.find("steamapps/common/") {
                    let rest = &exe_str[start + "steamapps/common/".len()..];
                    let game_name = rest.split('/').next().unwrap_or("").trim().to_string();
                    if !game_name.is_empty() {
                        return Some((game_name, String::new()));
                    }
                }
            }
            // Match basename against known game executables
            let basename = exe_link
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();
            for (app_id, exe_name) in &exe_map {
                if basename == exe_name.to_lowercase() {
                    return Some((String::new(), app_id.to_string()));
                }
            }
        }

        // ── 3. cwd check ──
        if let Ok(cwd_link) = std::fs::read_link(proc_path.join("cwd")) {
            let cwd_str = cwd_link.to_string_lossy().to_lowercase();
            if cwd_str.contains("steamapps/common/") {
                if let Some(start) = cwd_str.find("steamapps/common/") {
                    let rest = &cwd_str[start + "steamapps/common/".len()..];
                    let game_name = rest.split('/').next().unwrap_or("").trim().to_string();
                    if !game_name.is_empty() {
                        return Some((game_name, String::new()));
                    }
                }
            }
        }

        // ── 4. comm check (process name from kernel) ──
        if let Ok(comm) = std::fs::read_to_string(proc_path.join("comm")) {
            let comm = comm.trim().to_lowercase();
            for (app_id, exe_name) in &exe_map {
                if comm == exe_name.to_lowercase() {
                    return Some((String::new(), app_id.to_string()));
                }
            }
        }
    }
    None
}

/// Cross-platform game detection using sysinfo (Windows / macOS).
/// Scans running processes and matches against known game executables.
pub(crate) fn detect_running_game_sysinfo() -> Option<(String, String)> {
    use sysinfo::{ProcessRefreshKind, RefreshKind, System};

    let exe_map = game_exe_map();
    let s = System::new_with_specifics(
        RefreshKind::nothing()
            .with_processes(ProcessRefreshKind::nothing().with_exe(sysinfo::UpdateKind::Always)),
    );

    for process in s.processes().values() {
        let proc_name = process.name().to_string_lossy().to_lowercase();
        for (app_id, exe_name) in &exe_map {
            let exe_lower = exe_name.to_lowercase();
            #[cfg(target_os = "windows")]
            let matches = proc_name == format!("{}.exe", exe_lower) || proc_name == exe_lower;
            #[cfg(not(target_os = "windows"))]
            let matches = proc_name == exe_lower;

            if matches {
                return Some((String::new(), app_id.to_string()));
            }
        }
    }
    None
}

/// Returns (game_name, app_id, is_running).
/// Prefers an actively-running process over the most-recently-played manifest.
pub(crate) fn detect_game() -> (String, String, bool) {
    // 1. Active process detection
    #[cfg(target_os = "linux")]
    if let Some((name, id)) = detect_running_game_linux() {
        return (name, id, true);
    }
    #[cfg(not(target_os = "linux"))]
    if let Some((name, id)) = detect_running_game_sysinfo() {
        return (name, id, true);
    }

    // 2. Fall back: find the appmanifest with the highest LastPlayed timestamp
    let mut best_name = String::new();
    let mut best_id = String::new();
    let mut best_ts: u64 = 0;

    for lib in steam_library_paths() {
        let entries = match std::fs::read_dir(&lib) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let fname = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if !fname.starts_with("appmanifest_") || !fname.ends_with(".acf") {
                continue;
            }
            if let Some((name, id, ts)) = parse_acf(&path) {
                if ts > best_ts {
                    best_ts = ts;
                    best_name = name;
                    best_id = id;
                }
            }
        }
    }

    if best_name.is_empty() {
        (String::new(), String::new(), false)
    } else {
        (best_name, best_id, false)
    }
}

pub(crate) fn get_game_details(app_id: &str, name: &str) -> (String, String) {
    match app_id {
        "1091500" => ("Cyberpunk 2077".to_string(), "Action RPG. Recommended Settings: Steam Deck Preset, FSR Enabled (Quality), cap at 30 or 40FPS. Common tweaks: Use Proton Experimental to resolve audio crackling or crash-on-launch issues.".to_string()),
        "1174180" => ("Red Dead Redemption 2".to_string(), "Action-Adventure. Recommended Settings: Medium/Low mix, FSR Ultra Quality. Common tweaks: Switch from Vulkan to DX12 API in graphics settings if experiencing graphics memory leak crashes.".to_string()),
        "1887720" => ("Hades II".to_string(), "Action Rogue-like. Recommended Settings: High settings, Native resolution. Extremely well optimized (90FPS+ on Steam Deck OLED). No special troubleshooting needed.".to_string()),
        "1145360" => ("Hades".to_string(), "Action Rogue-like. Recommended Settings: Native resolution. Extremely well optimized. No special troubleshooting needed.".to_string()),
        "1245620" => ("Elden Ring".to_string(), "Action RPG / Souls-like. Recommended Settings: Medium settings, 800p, Lock at 30FPS for visual stability. Common tweaks: Use Proton Experimental and enable CryoUtilities swap file increase to resolve open world stutters.".to_string()),
        "730" => ("Counter-Strike 2".to_string(), "Competitive FPS. Recommended Settings: Low/Medium mix, Native resolution, cap at 60FPS for stability. Disable VSync for lowest input lag.".to_string()),
        "440" => ("Team Fortress 2".to_string(), "Team-based FPS. Recommended Settings: Medium/High, Native resolution. Well optimized. Add -novid to skip intro.".to_string()),
        "570" => ("Dota 2".to_string(), "MOBA. Recommended Settings: Medium/High, Native resolution. Extremely well optimized. Use Vulkan API for best performance.".to_string()),
        "292030" => ("The Witcher 3".to_string(), "Action RPG. Recommended Settings: Medium/Low mix, FSR Quality, cap at 30FPS. Disable HairWorks for +10 FPS.".to_string()),
        "374320" => ("Dark Souls III".to_string(), "Action RPG / Souls-like. Recommended Settings: Medium settings, 800p. Use Proton Experimental. Disable motion blur.".to_string()),
        "435150" => ("Divinity: Original Sin 2".to_string(), "CRPG. Recommended Settings: High settings, Native resolution. Well optimized. Use DirectX mode.".to_string()),
        "275850" => ("No Man's Sky".to_string(), "Exploration / Survival. Recommended Settings: Medium/Low mix, FSR Quality. Cap at 30FPS for stability in dense planets.".to_string()),
        "1086940" => ("Baldur's Gate 3".to_string(), "CRPG. Recommended Settings: Low/Medium mix, FSR Quality, 800p. Vulkan API recommended. Disable depth of field.".to_string()),
        "1282100" => ("Resident Evil 4".to_string(), "Survival Horror. Recommended Settings: Medium settings, FSR Quality, 800p. RE Engine is well optimized.".to_string()),
        "1817230" => ("Hi-Fi Rush".to_string(), "Action / Rhythm. Recommended Settings: High settings, Native resolution. Extremely well optimized (120FPS+).".to_string()),
        "1693980" => ("Dead Space (2023)".to_string(), "Survival Horror. Recommended Settings: Medium/Low mix, FSR Quality, 800p. Disable motion blur and film grain.".to_string()),
        "1593500" => ("God of War".to_string(), "Action-Adventure. Recommended Settings: Low/Medium mix, FSR Performance, 800p. Use Proton Experimental.".to_string()),
        "1449690" => ("The Last of Us Part I".to_string(), "Action-Adventure. Recommended Settings: Low settings, FSR Performance, 800p. Expect some shader compilation stutter.".to_string()),
        "2358720" => ("Black Myth: Wukong".to_string(), "Action RPG. Recommended Settings: Low/Medium mix, FSR Performance, 800p. Use frame generation if available.".to_string()),
        "962130" => ("Grounded".to_string(), "Survival. Recommended Settings: Medium settings, Native resolution. Well optimized. Disable VSync for lower input lag.".to_string()),
        "228970" => ("SteamOS / Desktop".to_string(), "Steam Deck OS interface and Desktop utility tools.".to_string()),
        _ => {
            if name.is_empty() {
                ("Unknown Game".to_string(), "No specific Steam Deck settings profile found. Use default Proton settings.".to_string())
            } else {
                (name.to_string(), "Steam Deck settings recommendations: Match resolution to 1280x800, use FSR if framerate drops below 30, and run with Proton Experimental if startup issues occur.".to_string())
            }
        }
    }
}

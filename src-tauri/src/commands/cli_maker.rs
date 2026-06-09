use crate::AppHandle;
use std::path::PathBuf;

// ── Data Types ─────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct CliCommandDef {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub category: String,
    pub action: CliAction,
    pub shortcut: Option<String>,
    pub radial_bind: Option<u8>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum CliAction {
    Prompt {
        template: String,
        use_llm: bool,
    },
    Shell {
        command: String,
        cwd: Option<String>,
    },
    View {
        view_name: String,
    },
    Chain {
        steps: Vec<String>,
    },
    Plugin {
        lua_code: String,
    },
}

#[derive(serde::Serialize, Clone)]
pub struct CliHook {
    pub id: String,
    pub name: String,
    pub event: String,
    pub enabled: bool,
}

// ── Persistence ────────────────────────────────────────────────────────────

fn cli_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("cli_commands")
}

fn cli_path(app: &AppHandle, id: &str) -> PathBuf {
    cli_dir(app).join(format!(
        "{}.json",
        id.replace(|c: char| !c.is_alphanumeric() || c.is_whitespace(), "_")
    ))
}

fn load_all(app: &AppHandle) -> Vec<CliCommandDef> {
    let dir = cli_dir(app);
    if !dir.exists() {
        return vec![];
    }
    let mut cmds = Vec::new();
    for entry in std::fs::read_dir(&dir).ok().into_iter().flatten().flatten() {
        let path = entry.path();
        if path.extension() == Some(std::ffi::OsStr::new("json")) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(cmd) = serde_json::from_str::<CliCommandDef>(&content) {
                    cmds.push(cmd);
                }
            }
        }
    }
    cmds
}

fn save_one(app: &AppHandle, cmd: &CliCommandDef) {
    let dir = cli_dir(app);
    let _ = std::fs::create_dir_all(&dir);
    let path = cli_path(app, &cmd.id);
    let _ = std::fs::write(&path, serde_json::to_string_pretty(cmd).unwrap_or_default());
}

fn delete_one(app: &AppHandle, id: &str) {
    let path = cli_path(app, id);
    let _ = std::fs::remove_file(&path);
}

// ── Commands ───────────────────────────────────────────────────────────────

pub fn cli_list_commands(app: AppHandle) -> Result<String, String> {
    let user_cmds = load_all(&app);
    // In a full implementation, also introspect Lua _commands table here
    Ok(serde_json::to_string(&user_cmds).unwrap_or_default())
}

pub fn cli_create_command(def: String, app: AppHandle) -> Result<String, String> {
    let cmd: CliCommandDef = serde_json::from_str(&def).map_err(|e| e.to_string())?;
    save_one(&app, &cmd);
    Ok(cmd.id.clone())
}

pub fn cli_update_command(id: String, def: String, app: AppHandle) -> Result<(), String> {
    let mut cmd: CliCommandDef = serde_json::from_str(&def).map_err(|e| e.to_string())?;
    cmd.id = id;
    save_one(&app, &cmd);
    Ok(())
}

pub fn cli_delete_command(id: String, app: AppHandle) -> Result<(), String> {
    delete_one(&app, &id);
    Ok(())
}

pub fn cli_run_command(id: String, args: String, app: AppHandle) -> Result<String, String> {
    let cmds = load_all(&app);
    let cmd = cmds
        .into_iter()
        .find(|c| c.id == id)
        .ok_or("Command not found")?;

    let output = match cmd.action {
        CliAction::Prompt {
            template,
            use_llm: _,
        } => {
            let filled = template.replace("{{input}}", &args);
            format!("[Prompt] {}", filled)
        }
        CliAction::Shell { command, cwd: _ } => {
            format!("[Shell] {}", command)
        }
        CliAction::View { view_name } => {
            format!("[View] {}", view_name)
        }
        CliAction::Chain { steps } => {
            format!("[Chain] {} steps", steps.len())
        }
        CliAction::Plugin { lua_code } => {
            format!("[Plugin] {} chars", lua_code.len())
        }
    };

    Ok(output)
}

pub fn cli_list_hooks() -> Result<String, String> {
    // Stub: would introspect Lua _hooks table
    Ok("[]".to_string())
}

pub fn cli_toggle_hook(_id: String, _enabled: bool) -> Result<(), String> {
    Ok(())
}

pub fn cli_export_lua(id: String, app: AppHandle) -> Result<String, String> {
    let cmds = load_all(&app);
    let cmd = cmds
        .into_iter()
        .find(|c| c.id == id)
        .ok_or("Command not found")?;

    let lua = match cmd.action {
        CliAction::Prompt { template, use_llm } => {
            format!(
                r#"registerCommand("{}", function(args)
    local template = [[{}]]
    local filled = template:gsub("{{{{input}}}}", args)
    {}
end)"#,
                cmd.name,
                template,
                if use_llm {
                    "sendPrompt(filled)"
                } else {
                    "return filled"
                }
            )
        }
        CliAction::Shell { command, cwd } => {
            let cd = cwd
                .map(|p| format!("    execute(\"cd {} && {}\")", p, command))
                .unwrap_or_else(|| format!("    execute(\"{}\")", command));
            format!(
                r#"registerCommand("{}", function(args)
    local cmd = [[{}]]:gsub("{{{{input}}}}", args)
{}
end)"#,
                cmd.name, command, cd
            )
        }
        CliAction::View { view_name } => {
            format!(
                r#"registerCommand("{}", function(args)
    -- Switch to view: {}
end)"#,
                cmd.name, view_name
            )
        }
        CliAction::Chain { steps } => {
            let steps_lua = steps
                .iter()
                .enumerate()
                .map(|(i, step)| {
                    let escaped = step.replace('\\', "\\\\").replace('"', "\\\"");
                    format!(
                        "    -- step {}\n    step_result = execute(\"{}\" .. \" \" .. step_result)",
                        i + 1,
                        escaped
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");
            format!(
                r#"registerCommand("{}", function(args)
    local step_result = args
{}
    return step_result
end)"#,
                cmd.name, steps_lua
            )
        }
        CliAction::Plugin { lua_code } => lua_code,
    };

    Ok(lua)
}

/// Parse a Lua file containing `registerCommand(...)` blocks and return
/// a JSON array of `CliCommandDef` structs. Also saves them to disk.
pub fn cli_import_lua(path: String, app: AppHandle) -> Result<String, String> {
    // Reject path-traversal attempts
    if path.contains("..") {
        return Err("Invalid path".into());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| format!("Cannot read file: {}", e))?;

    let mut defs: Vec<CliCommandDef> = Vec::new();
    let mut pos = 0usize;

    while pos < content.len() {
        let Some(rel) = content[pos..].find("registerCommand(") else {
            break;
        };
        let abs_start = pos + rel;
        let after_paren = abs_start + "registerCommand(".len();

        // Extract quoted name
        let Some(q1) = content[after_paren..].find('"') else {
            pos = abs_start + 1;
            continue;
        };
        let name_start = after_paren + q1 + 1;
        let Some(q2) = content[name_start..].find('"') else {
            pos = abs_start + 1;
            continue;
        };
        let name = content[name_start..name_start + q2].to_string();

        // Find closing end)
        let block_end_rel = content[abs_start..].find("end)");
        let block_end = match block_end_rel {
            Some(e) => abs_start + e + "end)".len(),
            None => {
                pos = abs_start + 1;
                continue;
            }
        };
        let body = &content[abs_start..block_end];

        // Classify action by body content
        let (category, action) = if body.contains("sendPrompt(") || body.contains("template") {
            let template = lua_extract_long_string(body).unwrap_or_default();
            let use_llm = body.contains("sendPrompt(");
            (
                "prompt".to_string(),
                CliAction::Prompt { template, use_llm },
            )
        } else if body.contains("execute(") {
            let command = lua_extract_execute_arg(body).unwrap_or_default();
            ("shell".to_string(), CliAction::Shell { command, cwd: None })
        } else {
            (
                "plugin".to_string(),
                CliAction::Plugin {
                    lua_code: body.to_string(),
                },
            )
        };

        let id = lua_id_from_name(&name);
        let def = CliCommandDef {
            id,
            name: name.clone(),
            description: format!("Imported from Lua: {}", name),
            icon: "code2".to_string(),
            category,
            action,
            shortcut: None,
            radial_bind: None,
        };
        save_one(&app, &def);
        defs.push(def);

        pos = block_end;
    }

    if defs.is_empty() {
        return Err("No registerCommand(...) blocks found in file".into());
    }

    serde_json::to_string(&defs).map_err(|e| e.to_string())
}

fn lua_extract_long_string(body: &str) -> Option<String> {
    let s = body.find("[[")? + 2;
    let e = body[s..].find("]]")? + s;
    Some(body[s..e].trim().to_string())
}

fn lua_extract_execute_arg(body: &str) -> Option<String> {
    let marker = "execute(\"";
    let s = body.find(marker)? + marker.len();
    let e = body[s..].find('"')? + s;
    Some(body[s..e].to_string())
}

fn lua_id_from_name(name: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    name.hash(&mut h);
    format!("imported_{:x}", h.finish())
}

/// Save a command as a Lua plugin file in the plugins/ directory, then hot-reload.
pub fn cli_maker_save_plugin(id: String, app: AppHandle) -> Result<String, String> {
    let lua = cli_export_lua(id.clone(), app.clone())?;

    // Find plugins directory: <user_config_dir>/plugins or adjacent to binary
    let plugins_dir = crate::user_config_dir().join("plugins");
    std::fs::create_dir_all(&plugins_dir).map_err(|e| e.to_string())?;

    let cmds = load_all(&app);
    let cmd = cmds
        .into_iter()
        .find(|c| c.id == id)
        .ok_or("Command not found")?;

    let filename = format!(
        "{}.lua",
        cmd.name
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric(), "_")
    );
    let path = plugins_dir.join(&filename);
    std::fs::write(&path, &lua).map_err(|e| format!("Write failed: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

/// Export a command as a standalone script (.lua / .sh / .py) to ~/scripts/.
pub fn cli_maker_export(id: String, format: String, app: AppHandle) -> Result<String, String> {
    let cmds = load_all(&app);
    let cmd = cmds
        .into_iter()
        .find(|c| c.id == id)
        .ok_or("Command not found")?;

    let scripts_dir = {
        #[cfg(target_os = "windows")]
        let home = std::env::var("USERPROFILE")
            .or_else(|_| {
                std::env::var("HOMEDRIVE").and_then(|d| std::env::var("HOMEPATH").map(|p| d + &p))
            })
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|_| std::path::PathBuf::from("."));
        #[cfg(not(target_os = "windows"))]
        let home = std::env::var("HOME")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|_| std::path::PathBuf::from("."));
        home.join("scripts")
    };
    std::fs::create_dir_all(&scripts_dir).map_err(|e| e.to_string())?;

    let (content, ext) = match format.as_str() {
        "bash" | "sh" => {
            let body = match &cmd.action {
                CliAction::Shell { command, cwd } => {
                    let cd = cwd
                        .as_deref()
                        .map(|d| format!("cd \"{d}\"\n"))
                        .unwrap_or_default();
                    format!(
                        "#!/usr/bin/env bash\n# {}\n{}{}\n",
                        cmd.description, cd, command
                    )
                }
                _ => format!(
                    "#!/usr/bin/env bash\n# {}\necho \"Run: {}\"\n",
                    cmd.description, cmd.name
                ),
            };
            (body, "sh")
        }
        "python" | "py" => {
            let body = format!(
                "#!/usr/bin/env python3\n# {}\n\nimport sys\n\ndef main(args):\n    print('{}:', args)\n\nif __name__ == '__main__':\n    main(' '.join(sys.argv[1:]))\n",
                cmd.description, cmd.name
            );
            (body, "py")
        }
        _ => {
            let lua = cli_export_lua(id, app)?;
            (lua, "lua")
        }
    };

    let filename = format!(
        "{}.{}",
        cmd.name
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric(), "_"),
        ext
    );
    let path = scripts_dir.join(&filename);
    std::fs::write(&path, &content).map_err(|e| format!("Write failed: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

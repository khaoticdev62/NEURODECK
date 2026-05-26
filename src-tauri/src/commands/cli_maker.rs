use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

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

#[command]
pub fn cli_list_commands(app: AppHandle) -> Result<String, String> {
    let user_cmds = load_all(&app);
    // In a full implementation, also introspect Lua _commands table here
    Ok(serde_json::to_string(&user_cmds).unwrap_or_default())
}

#[command]
pub fn cli_create_command(def: String, app: AppHandle) -> Result<String, String> {
    let cmd: CliCommandDef = serde_json::from_str(&def).map_err(|e| e.to_string())?;
    save_one(&app, &cmd);
    Ok(cmd.id.clone())
}

#[command]
pub fn cli_update_command(id: String, def: String, app: AppHandle) -> Result<(), String> {
    let mut cmd: CliCommandDef = serde_json::from_str(&def).map_err(|e| e.to_string())?;
    cmd.id = id;
    save_one(&app, &cmd);
    Ok(())
}

#[command]
pub fn cli_delete_command(id: String, app: AppHandle) -> Result<(), String> {
    delete_one(&app, &id);
    Ok(())
}

#[command]
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

#[command]
pub fn cli_list_hooks() -> Result<String, String> {
    // Stub: would introspect Lua _hooks table
    Ok("[]".to_string())
}

#[command]
pub fn cli_toggle_hook(_id: String, _enabled: bool) -> Result<(), String> {
    Ok(())
}

#[command]
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
        CliAction::Chain { .. } => "-- Chain export not yet implemented\n".to_string(),
        CliAction::Plugin { lua_code } => lua_code,
    };

    Ok(lua)
}

#[command]
pub fn cli_import_lua(_path: String) -> Result<String, String> {
    // Stub: would parse Lua registerCommand block back into CliCommandDef
    Ok("{}".to_string())
}

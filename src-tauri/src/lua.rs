use mlua::{Function, Lua, Table, Value, Variadic};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

pub struct LuaEngine {
    lua: Lua,
}

impl LuaEngine {
    pub fn new(app_handle: AppHandle) -> mlua::Result<Self> {
        let lua = Lua::new();

        // Initialize commands and hooks tables
        lua.globals().set("_commands", lua.create_table()?)?;
        lua.globals().set("_hooks", lua.create_table()?)?;

        // 1. print(...) override to stream stdout to the frontend
        let app_handle_print = app_handle.clone();
        let print_fn = lua.create_function(move |_, args: Variadic<Value>| {
            let mut parts = Vec::new();
            for arg in args {
                let s = match arg {
                    Value::Nil => "nil".to_string(),
                    Value::Boolean(b) => b.to_string(),
                    Value::Integer(i) => i.to_string(),
                    Value::Number(n) => n.to_string(),
                    Value::String(s) => s.to_str().unwrap_or("").to_string(),
                    Value::Table(_) => "[table]".to_string(),
                    Value::Function(_) => "[function]".to_string(),
                    Value::Thread(_) => "[thread]".to_string(),
                    Value::UserData(_) => "[userdata]".to_string(),
                    Value::LightUserData(_) => "[lightuserdata]".to_string(),
                    Value::Error(e) => e.to_string(),
                };
                parts.push(s);
            }
            let output = parts.join("\t");
            // Emit to frontend using the existing command output stream
            let _ = app_handle_print.emit("command_stdout", output);
            Ok(())
        })?;
        lua.globals().set("print", print_fn)?;

        // 2. execute(cmd) function to execute terminal commands
        let execute_fn = lua.create_function(move |_, cmd_str: String| {
            crate::security::validate_terminal_command(&cmd_str, "lua-execute")
                .map_err(mlua::Error::external)?;
            crate::security::validate_script_payload(
                &cmd_str,
                if cfg!(target_os = "windows") {
                    "powershell"
                } else {
                    "bash"
                },
                "lua-execute",
                None,
            )
            .map_err(mlua::Error::external)?;
            let mut cmd = if cfg!(target_os = "windows") {
                let mut c = std::process::Command::new("cmd.exe");
                c.arg("/c").arg(&cmd_str);
                c
            } else {
                let mut c = std::process::Command::new("sh");
                c.arg("-c").arg(&cmd_str);
                c
            };
            match cmd.output() {
                Ok(output) => {
                    let combined = [output.stdout, output.stderr].concat();
                    Ok(String::from_utf8_lossy(&combined).into_owned())
                }
                Err(e) => Ok(format!("Error: {}", e)),
            }
        })?;
        lua.globals().set("execute", execute_fn)?;

        // 3. registerCommand(name, callback) function
        let register_cmd_fn =
            lua.create_function(move |lua, (name, func): (String, Function)| {
                let commands: Table = lua.globals().get("_commands")?;
                commands.set(name, func)?;
                Ok(())
            })?;
        lua.globals().set("registerCommand", register_cmd_fn)?;

        // 4. registerHook(event, callback) function
        let register_hook_fn =
            lua.create_function(move |lua, (event, func): (String, Function)| {
                let hooks: Table = lua.globals().get("_hooks")?;
                let event_hooks: Table = match hooks.get::<_, Option<Table>>(event.as_str())? {
                    Some(t) => t,
                    None => {
                        let t = lua.create_table()?;
                        hooks.set(event.as_str(), t.clone())?;
                        t
                    }
                };
                let len = event_hooks.len()?;
                event_hooks.set(len + 1, func)?;
                Ok(())
            })?;
        lua.globals().set("registerHook", register_hook_fn)?;

        // 5. setPersona(name) function to set the active persona of the S-Term application
        let app_handle_persona = app_handle.clone();
        let set_persona_fn = lua.create_function(move |_, name: String| {
            let state = app_handle_persona.state::<std::sync::Mutex<crate::AppState>>();
            let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
            let is_valid = crate::PERSONAS.iter().any(|p| p.0 == name)
                || app.custom_personas.iter().any(|p| p.name == name);
            if is_valid {
                app.active_persona = name.clone();
                let _ = app_handle_persona.emit("persona_changed", name.clone());
                Ok(true)
            } else {
                Ok(false)
            }
        })?;
        lua.globals().set("setPersona", set_persona_fn)?;

        // 6. sendPrompt(prompt) function to execute prompts against active LLM provider
        let app_handle_prompt = app_handle.clone();
        let send_prompt_fn = lua.create_function(move |_, prompt: String| {
            let state = app_handle_prompt.state::<std::sync::Mutex<crate::AppState>>();
            let (provider, active_persona, custom_personas) = {
                let app = state.lock().unwrap_or_else(|e| e.into_inner());
                (
                    app.provider.clone(),
                    app.active_persona.clone(),
                    app.custom_personas.clone(),
                )
            };

            let system_prompt = crate::PERSONAS
                .iter()
                .find(|p| p.0 == active_persona)
                .map(|p| p.1.clone())
                .unwrap_or_else(|| {
                    custom_personas
                        .iter()
                        .find(|p| p.name == active_persona)
                        .map(|p| p.prompt.clone())
                        .unwrap_or_else(|| "You are a helpful assistant.".to_string())
                });

            let response = tauri::async_runtime::block_on(async move {
                provider
                    .chat_with_image(&prompt, &system_prompt, None, None)
                    .await
            });

            match response {
                Ok(res) => Ok(res),
                Err(e) => Ok(format!("Error: {}", e)),
            }
        })?;
        lua.globals().set("sendPrompt", send_prompt_fn)?;

        Ok(Self { lua })
    }

    pub fn run_script(&self, code: &str) -> Result<(), String> {
        self.lua
            .load(code)
            .exec()
            .map_err(|e| format!("Lua execution error: {}", e))
    }

    pub fn call_command(&self, name: &str, args: &str) -> Result<Option<String>, String> {
        let commands: Table = self
            .lua
            .globals()
            .get("_commands")
            .map_err(|e| format!("Failed to get _commands: {}", e))?;
        if commands.contains_key(name).unwrap_or(false) {
            let func: Function = commands
                .get(name)
                .map_err(|e| format!("Failed to get command function: {}", e))?;
            let res: Value = func
                .call(args)
                .map_err(|e| format!("Error executing command callback '{}': {}", name, e))?;
            match res {
                Value::String(s) => Ok(Some(s.to_str().unwrap_or("").to_string())),
                Value::Nil => Ok(None),
                other => Ok(Some(format!("{:?}", other))),
            }
        } else {
            Err(format!("Command {} not registered", name))
        }
    }

    pub fn is_command_registered(&self, name: &str) -> bool {
        if let Ok(commands) = self.lua.globals().get::<_, Table>("_commands") {
            commands.contains_key(name).unwrap_or(false)
        } else {
            false
        }
    }

    pub fn trigger_hook(&self, event: &str, mut data: String) -> Result<String, String> {
        let hooks: Table = self
            .lua
            .globals()
            .get("_hooks")
            .map_err(|e| format!("Failed to get _hooks: {}", e))?;
        if hooks.contains_key(event).unwrap_or(false) {
            let event_hooks: Table = hooks
                .get(event)
                .map_err(|e| format!("Failed to get hooks for event: {}", e))?;
            let len = event_hooks.len().unwrap_or(0);
            for i in 1..=len {
                let func: Function = event_hooks
                    .get(i)
                    .map_err(|e| format!("Failed to get hook function at index {}: {}", i, e))?;
                let res: Value = func
                    .call(data.clone())
                    .map_err(|e| format!("Error calling hook '{}': {}", event, e))?;
                if let Value::String(s) = res {
                    data = s.to_str().unwrap_or("").to_string();
                }
            }
        }
        Ok(data)
    }

    pub fn get_registered_commands(&self) -> Vec<String> {
        let mut names = Vec::new();
        if let Ok(commands) = self.lua.globals().get::<_, Table>("_commands") {
            let pairs = commands.pairs::<String, Value>();
            for (name, _) in pairs.flatten() {
                names.push(name);
            }
        }
        names
    }

    #[allow(clippy::too_many_arguments)]
    pub fn assemble_prompt(
        &self,
        persona: &str,
        task: &str,
        context: &str,
        tone: &str,
        constraints: &str,
        format: &str,
        examples: &str,
        formula: &str,
    ) -> Result<String, String> {
        let globals = self.lua.globals();
        let assemble_fn: Function = globals.get("assemble_prompt_via_lua").map_err(|e| {
            format!(
                "Failed to find assemble_prompt_via_lua function in Lua: {}",
                e
            )
        })?;

        let res: String = assemble_fn
            .call((
                persona.to_string(),
                task.to_string(),
                context.to_string(),
                tone.to_string(),
                constraints.to_string(),
                format.to_string(),
                examples.to_string(),
                formula.to_string(),
            ))
            .map_err(|e| format!("Error executing assemble_prompt_via_lua: {}", e))?;

        Ok(res)
    }

    pub fn load_plugins<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let dir = path.as_ref();
        if !dir.exists() {
            return Ok(());
        }
        let read_dir = std::fs::read_dir(dir)
            .map_err(|e| format!("Failed to read plugins directory: {}", e))?;
        for entry in read_dir.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().is_some_and(|ext| ext == "lua") {
                eprintln!("[neurodeck] loading plugin: {}", path.display());
                let code = std::fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read script file {}: {}", path.display(), e))?;
                self.run_script(&code)
                    .map_err(|e| format!("Failed to load plugin {}: {}", path.display(), e))?;
            }
        }
        Ok(())
    }
}

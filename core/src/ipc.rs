use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// An `Intent` represents a typed command originating from the frontend.
/// It replaces unstructured Tauri commands.
#[derive(Serialize, Deserialize, Debug, Clone, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/Intent.ts")]
#[serde(tag = "type", content = "payload")]
pub enum Intent {
    StartTerminal { id: String, shell: Option<String> },
    KillTerminal { id: String },
    TerminalInput { id: String, data: String },
    TerminalResize { id: String, cols: u16, rows: u16 },
    SendMessage { text: String, persona: String },
    CancelGeneration,
    RequestGameState,
}

/// A `StatePatch` represents a typed event originating from the backend.
/// The frontend listens to these to update its local state atomically.
#[derive(Serialize, Deserialize, Debug, Clone, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/StatePatch.ts")]
#[serde(tag = "type", content = "payload")]
pub enum StatePatch {
    TerminalOutput { id: String, data: String },
    TerminalExited { id: String, code: i32 },
    ChatResponseChunk { text: String },
    ChatResponseComplete,
    Error { message: String },
    GameState { name: String, is_running: bool },
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    #[test]
    fn export_bindings() {
        let dir = Path::new("../../frontend/src/bindings");
        fs::create_dir_all(dir).unwrap();
        
        let cfg = ts_rs::Config::default();
        let intent_ts = Intent::decl(&cfg);
        fs::write(dir.join("Intent.ts"), intent_ts).unwrap();

        let patch_ts = StatePatch::decl(&cfg);
        fs::write(dir.join("StatePatch.ts"), patch_ts).unwrap();
    }
}

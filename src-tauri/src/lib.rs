mod autocomplete;
mod audio_recorder;
pub mod bridge;
mod canvas_collab;
use mdns_sd::ServiceDaemon;
pub mod commands;
mod computer_use;
pub mod db;
pub mod tauri_compat;
pub mod config;
pub mod deckcode;
mod doc_indexer;
mod error;
mod ftp;
mod hf_model_mgr;
mod llm;
pub mod lsp;
mod lua;
mod mcp;
pub mod memory;
mod ollama_mgr;
mod projects;
mod search;
mod context_packs;
mod permissions;
mod privacy;
mod dashboard;
mod orchestrator;
mod plugin_mgr;
mod pty_manager;
mod remote_control;
mod scheduler;
mod security;
mod self_heal;
mod sftp;
mod storage;
pub mod sync;
mod torrent;
mod transfer;
mod tunnel;
mod whisper;
mod workflow;
mod workflow_engine;
pub mod models;
pub mod game;
pub mod paths;
pub mod providers;
use std::sync::atomic::{AtomicBool, AtomicUsize};
use std::sync::{Arc, Mutex};
use crate::llm::{
    GeminiProvider, HuggingFaceProvider, KimiProvider, LlmProvider, OllamaProvider,
};
use crate::memory::MemoryDB;

// Re-exports so existing callers (crate::PERSONAS, crate::user_config_dir, etc.) keep working.
pub(crate) use models::{CustomPersona, PERSONAS, THEMES};
pub(crate) use game::*;
pub use paths::*;
pub use tauri_compat::*;
pub(crate) use providers::*;


pub struct LuaState(pub Mutex<lua::LuaEngine>);

pub struct AppState {
    pub(crate) provider: Arc<dyn LlmProvider>,
    pub(crate) config: config::Config,
    pub(crate) session_id: String,
    pub(crate) messages: Vec<String>,
    pub(crate) active_persona: String,
    pub(crate) mem_db: Option<MemoryDB>,
    pub(crate) record_child: Option<std::process::Child>,
    /// Set to Some(flag) when a cpal recording is active (Windows/macOS).
    pub(crate) record_stop_flag: Option<Arc<AtomicBool>>,
    pub(crate) process_stdin_tx: Option<tokio::sync::mpsc::Sender<String>>,
    pub(crate) kill_tx: Option<tokio::sync::oneshot::Sender<()>>,
    pub(crate) active_process_id: u64,
    pub(crate) cancel_stream_tx: Option<tokio::sync::oneshot::Sender<()>>,
    pub(crate) compare_cancel_flag: Option<Arc<AtomicBool>>,
    pub custom_personas: Vec<CustomPersona>,
    pub(crate) mcp_abort: Option<tokio::task::AbortHandle>,
    pub(crate) mcp_port: u16,
    pub(crate) mcp_token: Option<String>,
    pub(crate) mcp_tool_whitelist: Vec<String>,
    // P17 — Whisper.cpp offline STT
    pub(crate) whisper_binary: String,
    pub(crate) whisper_model: String,
    // P19 — Live Canvas Collab
    pub(crate) collab_abort: Option<tokio::task::AbortHandle>,
    pub(crate) collab_tx: Option<tokio::sync::mpsc::Sender<String>>,
    pub(crate) collab_mode: Option<String>,
    pub(crate) collab_addr: Option<String>,
    pub(crate) collab_peer_count: Option<Arc<AtomicUsize>>,
    pub(crate) collab_mdns: Option<ServiceDaemon>,
    // Canvas streaming execution cancellation.
    pub(crate) canvas_exec_cancel_tx: Option<tokio::sync::oneshot::Sender<()>>,
    pub(crate) boot_self_heal: self_heal::SelfHealReport,
    // Privacy / sealed record unlock state
    pub(crate) unlock_state: privacy::UnlockState,
}



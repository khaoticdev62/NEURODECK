#![allow(dead_code, clippy::too_many_arguments, clippy::type_complexity)]

mod audio_recorder;
pub mod bridge;
mod canvas_collab;
use mdns_sd::ServiceDaemon;
pub mod commands;
mod computer_use;
pub mod config;
mod context_packs;
mod dashboard;
pub mod db;
pub mod deckcode;
mod doc_indexer;
mod error;
mod ftp;
pub mod game;
mod hf_model_mgr;
mod llm;
pub mod lsp;
mod lua;
mod mcp;
pub mod memory;
pub mod model_registry;
pub mod models;
mod ollama_mgr;
mod orchestrator;
pub mod paths;
mod permissions;
mod plugin_mgr;
mod privacy;
mod projects;
pub mod promptdrive;
pub mod providers;
mod pty_manager;
mod remote_control;
mod scheduler;
mod search;
mod security;
mod self_heal;
mod services;
mod sftp;
mod storage;
pub mod sync;
mod terminal;
mod torrent;
mod transfer;
mod tunnel;
mod whisper;
mod workflow;
mod workflow_engine;
use crate::llm::{KimiProvider, LlmProvider};
use crate::memory::MemoryDB;
use std::sync::atomic::{AtomicBool, AtomicUsize};
use std::sync::{Arc, Mutex};

// Re-exports so existing callers (crate::PERSONAS, crate::user_config_dir, etc.) keep working.
pub(crate) use game::*;
pub(crate) use models::{CustomPersona, PERSONAS, THEMES};
pub use paths::*;
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

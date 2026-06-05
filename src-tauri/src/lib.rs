mod autocomplete;
mod audio_recorder;
pub mod bridge;
mod canvas_collab;
use mdns_sd::ServiceDaemon;
pub mod commands;
mod computer_use;
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
pub mod models;
pub mod game;
pub mod paths;
pub mod providers;
use crate::commands::*;

use chrono::Utc;
use std::sync::atomic::{AtomicBool, AtomicUsize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;

use crate::llm::{
    GeminiProvider, HuggingFaceProvider, KimiProvider, LlmProvider, OllamaProvider,
};
use crate::memory::MemoryDB;

// Re-exports so existing callers (crate::PERSONAS, crate::user_config_dir, etc.) keep working.
pub(crate) use models::{CustomPersona, PERSONAS, THEMES};
pub(crate) use game::*;
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
}


pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // Disable WebKit compositing by default on Linux to prevent blank/white screens in Gamescope/Wayland
        if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
        // Disable DMA-BUF renderer — causes blank white page under Gamescope/Wayland on Steam Deck
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        // Fall back to X11/XWayland if no Wayland display socket is available.
        // Under Gamescope without --expose-wayland, WAYLAND_DISPLAY is unset,
        // causing GTK to attempt Wayland EGL → fails with EGL_BAD_PARAMETER.
        if std::env::var("WAYLAND_DISPLAY").is_err() && std::env::var("GDK_BACKEND").is_err() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }

    let config_root = user_config_dir();
    let _ = std::fs::create_dir_all(&config_root);

    // Initialize tracing
    let log_dir = config_root.join("logs");
    let _ = std::fs::create_dir_all(&log_dir);
    let file_appender = tracing_appender::rolling::daily(log_dir, "neurodeck.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    tracing_subscriber::fmt()
        .with_writer(non_blocking)
        .with_ansi(false)
        .init();
    tracing::info!("Starting NEURODECK...");

    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--tunnel".to_string()) || args.contains(&"--daemon".to_string()) {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        if let Err(e) = rt.block_on(tunnel::run_tunnel_server_headless()) {
            eprintln!("Tunnel server error: {}", e);
            std::process::exit(1);
        }
        std::process::exit(0);
    }

    // Bridge server mode: HTTP + WebSocket instead of Tauri IPC
    if args.contains(&"--bridge".to_string()) {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        if let Err(e) = rt.block_on(bridge::run_bridge_server(&config_root, &get_config_path())) {
            eprintln!("Bridge server error: {}", e);
            std::process::exit(1);
        }
        std::process::exit(0);
    }

    // Load env file variables (e.g. GEMINI_API_KEY from ~/.config/neurodeck/env)
    load_env_file();

    let config_path = get_config_path();
    let boot_self_heal = self_heal::boot_self_heal(&config_root, &config_path);
    let mut config = boot_self_heal.config;

    // Seed default agent profiles on first run
    if config.llm.agents.is_empty() {
        config.llm.agents = default_agents();
        // Set active agent to match the current configured provider/model
        let target_provider = config.llm.default_provider.clone();
        let target_model = if target_provider == "gemini" {
            config.llm.gemini_model.clone()
        } else {
            config.llm.ollama_model.clone()
        };
        config.llm.active_agent_id = config
            .llm
            .agents
            .iter()
            .find(|a| a.provider == target_provider && a.model == target_model)
            .map(|a| a.id.clone())
            .unwrap_or_else(|| config.llm.agents[0].id.clone());
        let _ = config::save_config(&config_path, &config);
    } else if config.llm.active_agent_id.is_empty() {
        config.llm.active_agent_id = config
            .llm
            .agents
            .first()
            .map(|a| a.id.clone())
            .unwrap_or_default();
        let _ = config::save_config(&config_path, &config);
    }

    let provider = create_provider(&config);

    let data_dir = config_root.join("data");
    let mem_db = boot_self_heal.mem_db;
    let custom_personas = boot_self_heal.custom_personas;

    let whisper_binary = config.stt.whisper_binary.clone();
    let whisper_model = config.stt.whisper_model.clone();
    let torrent_download_root = data_dir.join("torrents/downloads");
    let _ = std::fs::create_dir_all(&torrent_download_root);

    let app_state = AppState {
        provider,
        config,
        session_id: Utc::now().format("%Y%m%d-%H%M%S").to_string(),
        messages: Vec::new(),
        active_persona: "Default".to_string(),
        mem_db,
        record_child: None,
        record_stop_flag: None,
        process_stdin_tx: None,
        kill_tx: None,
        active_process_id: 0,
        cancel_stream_tx: None,
        compare_cancel_flag: None,
        custom_personas,
        mcp_abort: None,
        mcp_port: 13337,
        mcp_token: None,
        mcp_tool_whitelist: mcp::default_tool_whitelist(),
        whisper_binary,
        whisper_model,
        collab_abort: None,
        collab_tx: None,
        collab_mode: None,
        collab_addr: None,
        collab_peer_count: None,
        collab_mdns: None,
        canvas_exec_cancel_tx: None,
        boot_self_heal: boot_self_heal.report,
    };

    tauri::Builder::default()
        .manage(Mutex::new(app_state))
        .manage(pty_manager::PtyState::new())
        .manage(remote_control::RemoteControlState::default())
        .manage(transfer::SharedTransferState(Arc::new(Mutex::new(
            transfer::TransferState::new(),
        ))))
        .manage(torrent::TorrentState::new(torrent_download_root))
        .manage(Arc::new(scheduler::SchedulerManaged::new()))
        .manage(orchestrator::OrchestratorManaged::new())
        .manage(Arc::new(Mutex::new(lsp::LspManager::new())))
        .manage(crate::deckcode::DeckCodeState(Mutex::new((None, None))))
        .manage(crate::deckcode::DeckCodeActiveLang(Arc::new(Mutex::new(
            "plain_text".to_string(),
        ))))
        .setup(|app| {
            // Start file transfer services
            let transfer_state = app.state::<transfer::SharedTransferState>().0.clone();
            let download_dir = app.path()
                .download_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default())
                .join("neurodeck_transfers");
            transfer::start_transfer_services(app.handle().clone(), transfer_state, download_dir);

            // Load DeckCode schema if available
            let schema_path =
                std::path::PathBuf::from("../deckcode-controller-profile.schema.json");
            let schema_path = if schema_path.exists() {
                schema_path
            } else {
                std::path::PathBuf::from("deckcode-controller-profile.schema.json")
            };

            let multilang_path =
                std::path::PathBuf::from("../deckcode-multilang-code-entry.profile.json");
            let multilang_path = if multilang_path.exists() {
                multilang_path
            } else {
                std::path::PathBuf::from("deckcode-multilang-code-entry.profile.json")
            };

            let mut loaded_schema = None;
            let mut loaded_multilang = None;

            if let Ok(schema) =
                crate::deckcode::load_schema(schema_path.to_str().unwrap_or_default())
            {
                loaded_schema = Some(schema);
                tracing::info!("Loaded DeckCode Controller Profile");
            } else {
                tracing::warn!("Failed to load deckcode-controller-profile.schema.json");
            }

            if let Ok(ml_schema) =
                crate::deckcode::load_multilang_profile(multilang_path.to_str().unwrap_or_default())
            {
                loaded_multilang = Some(ml_schema);
                tracing::info!("Loaded DeckCode MultiLang Profile");
            } else {
                tracing::warn!("Failed to load deckcode-multilang-code-entry.profile.json");
            }

            {
                let state = app.state::<crate::deckcode::DeckCodeState>();
                *state.0.lock().unwrap_or_else(|e| e.into_inner()) = (loaded_schema.clone(), loaded_multilang.clone());
            }

            if let Some(schema) = loaded_schema {
                let (tx, rx) = std::sync::mpsc::channel();
                crate::deckcode::input::start_input_daemon(tx);

                let app_handle_clone = app.handle().clone();
                let active_lang = app.state::<crate::deckcode::DeckCodeActiveLang>().0.clone();

                tauri::async_runtime::spawn_blocking(move || {
                    let resolver =
                        crate::deckcode::resolver::DeckCodeResolver::new(schema, loaded_multilang);
                    let mut context = crate::deckcode::resolver::ResolverContext::default();

                    while let Ok(event) = rx.recv() {
                        // Update context with latest language
                        context.active_language_id = active_lang.lock().unwrap_or_else(|e| e.into_inner()).clone();

                        if let Some(binding) = resolver.resolve(&event, &context) {
                            crate::deckcode::dispatch::dispatch_action(&app_handle_clone, &binding);
                        }
                    }
                });
            }

            // Initialize Lua state
            let lua_engine = lua::LuaEngine::new(app.handle().clone()).map_err(|e| {
                let err: Box<dyn std::error::Error> = Box::new(e);
                tauri::Error::Setup(err.into())
            })?;

            // Resolve plugins dir: resource_dir (installed) → ./plugins (dev)
            let plugins_dir = app
                .path()
                .resource_dir()
                .map(|p| p.join("plugins"))
                .unwrap_or_else(|_| std::path::PathBuf::from("./plugins"));
            let plugins_dir = if plugins_dir.exists() {
                plugins_dir
            } else {
                std::path::PathBuf::from("./plugins")
            };

            // Create directories if they don't exist
            let _ = std::fs::create_dir_all(&plugins_dir);
            let _ = std::fs::create_dir_all("./scripts");

            let config_root = crate::user_config_dir();
            tauri::async_runtime::spawn(async move {
                loop {
                    crate::self_heal::maintain_runtime_layout(&config_root);
                    tokio::time::sleep(Duration::from_secs(45)).await;
                }
            });

            // Auto-backup memory on startup (runs in background, non-blocking)
            {
                let backup_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    let mem_db = {
                        let state = backup_handle.state::<Mutex<AppState>>();
                        let guard = state.lock().unwrap_or_else(|e| e.into_inner());
                        guard.mem_db.clone()
                    };
                    if let Some(db) = mem_db {
                        if let Ok(records) = db.export_all_records() {
                            if !records.is_empty() {
                                let _ = commands::system::run_memory_backup(&db);
                            }
                        }
                    }
                });
            }

            // Load plugins on startup
            if let Err(e) = lua_engine.load_plugins(&plugins_dir) {
                eprintln!("[neurodeck] plugin load error: {}", e);
            }

            // Manage LuaState
            app.manage(LuaState(Mutex::new(lua_engine)));

            // Start task scheduler synchronously
            let sched_managed = app.state::<Arc<scheduler::SchedulerManaged>>().clone();
            let app_handle = app.handle().clone();
            if let Err(e) = tauri::async_runtime::block_on(sched_managed.start(app_handle)) {
                tracing::warn!("Failed to start task scheduler: {}", e);
            }

            // System tray
            let mut tray_builder = tauri::tray::TrayIconBuilder::new().tooltip("NEURODECK");
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let tray = tray_builder
                .menu(&tauri::menu::Menu::with_items(
                    app,
                    &[
                        &tauri::menu::MenuItem::with_id(
                            app,
                            "show",
                            "Open NEURODECK",
                            true,
                            None::<&str>,
                        )?,
                        &tauri::menu::PredefinedMenuItem::separator(app)?,
                        &tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                    ],
                )?)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                // Left-click on tray icon toggles window visibility
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(app);
            if let Err(e) = tray {
                tracing::warn!("Failed to create system tray: {}", e);
            }

            // Close-to-tray: intercept window close and minimize instead of quit
            // unless the user has opted out in Settings → General.
            {
                let close_handle = app.handle().clone();
                if let Some(main_win) = app.get_webview_window("main") {
                    main_win.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            let should_minimize = {
                                let state = close_handle.state::<Mutex<AppState>>();
                                state
                                    .lock()
                                    .map(|s| s.config.prefs.minimize_to_tray_on_close)
                                    .unwrap_or(true)
                            };
                            if should_minimize {
                                api.prevent_close();
                                if let Some(win) = close_handle.get_webview_window("main") {
                                    let _ = win.hide();
                                }
                            }
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_state,
            get_boot_diagnostics,
            execute_command_stream,
            write_to_process,
            kill_process,
            get_personas,
            get_themes,
            set_persona,
            set_theme,
            save_session,
            load_latest_session,
            list_sessions,
            list_sessions_meta,
            load_session_by_id,
            delete_session,
            rename_session,
            new_session,
            fork_session,
            compare_models,
            send_command,
            speak_text,
            speak_text_stream,
            cancel_generation,
            #[cfg(debug_assertions)]
            execute_lua,
            export_session_markdown,
            export_session_content,
            autocomplete::get_terminal_autocomplete,
            doc_indexer::get_indexed_docs,
            doc_indexer::search_docs_semantic,
            doc_indexer::remove_indexed_doc,
            pty_manager::pty_spawn,
            pty_manager::pty_write,
            pty_manager::pty_resize,
            pty_manager::pty_kill,
            tunnel::start_tunnel_server,
            tunnel::stop_tunnel_server,
            tunnel::send_tunnel_request,
            transfer::start_file_transfer,
            transfer::respond_to_transfer,
            transfer::get_discovered_peers,
            transfer::get_active_transfers,
            transfer::cancel_transfer,
            transfer::set_group_code,
            transfer::get_group_code,
            torrent::torrent_get_status,
            torrent::torrent_list,
            torrent::torrent_add,
            torrent::torrent_remove,
            torrent::torrent_pause,
            torrent::torrent_resume,
            torrent::torrent_pause_all,
            torrent::torrent_resume_all,
            torrent::torrent_get_download_root,
            torrent::torrent_open_download_root,
            torrent::torrent_open_save_path,
            open_external,
            browser_open,
            browser_navigate,
            browser_hide,
            browser_show,
            browser_get_url,
            browser_exec,
            browser_open_session,
            browser_navigate_session,
            browser_get_content,
            browser_click,
            browser_fill,
            browser_screenshot,
            browser_evaluate_js,
            browser_close_session,
            browser_save_to_memory,
            browser_get_citation,
            install_bmad_to_dir,
            get_game_context,
            agent_step,
            agent_exec_code,
            agent::exec_code_stream,
            agent::cancel_exec,
            ai_edit_code,
            list_agents,
            get_active_agent_id,
            switch_agent,
            add_agent,
            delete_agent,
            get_recommended_models,
            memory_list_all,
            memory_list_by_namespace,
            memory_delete,
            memory_pin,
            memory_add_fact,
            memory_export,
            memory_import_data,
            memory_backup_auto,
            memory_list_backups,
            memory_restore_backup,
            memory_search_semantic,
            ftp::ftp_list_dir,
            ftp::ftp_download_file,
            ftp::ftp_upload_file,
            ftp::ftp_test_connection,
            sftp::sftp_list_dir,
            sftp::sftp_download_file,
            sftp::sftp_upload_file,
            sftp::sftp_test_connection,
            ollama_mgr::ollama_list_models,
            ollama_mgr::ollama_pull_model,
            ollama_mgr::ollama_delete_model,
            hf_model_mgr::hf_search_models,
            hf_model_mgr::hf_get_steam_deck_models,
            hf_model_mgr::hf_get_model_info,
            hf_model_mgr::hf_download_model,
            hf_model_mgr::hf_cancel_download,
            hf_model_mgr::hf_list_downloads,
            hf_model_mgr::hf_list_installed_models,
            hf_model_mgr::hf_delete_model,
            set_config,
            get_config,
            save_gemini_api_key,
            get_gemini_api_key,
            save_hf_api_key,
            get_hf_api_key,
            save_kimi_api_key,
            get_kimi_api_key,
            save_openai_compat_api_key,
            get_openai_compat_api_key,
            save_ssh_credential,
            get_ssh_credential,
            delete_ssh_credential,
            save_sftp_credential,
            get_sftp_credential,
            delete_sftp_credential,
            test_llm_connection,
            get_context_stats,
            list_custom_personas,
            add_custom_persona,
            delete_custom_persona,
            plugin_mgr::list_plugins,
            plugin_mgr::fetch_plugin_registry,
            plugin_mgr::toggle_plugin,
            plugin_mgr::install_plugin,
            plugin_mgr::install_plugin_from_registry,
            plugin_mgr::uninstall_plugin,
            plugin_mgr::read_plugin,
            plugin_mgr::save_plugin,
            plugin_mgr::reload_plugins,
            computer_use::computer_screenshot,
            computer_use::computer_mouse_move,
            computer_use::computer_mouse_click,
            computer_use::computer_type,
            computer_use::computer_key,
            computer_use::computer_find_text,
            shell_autocomplete,
            read_last_screenshot,
            search_history_ai,
            generate_jpe_explanation,
            index_directory,
            get_doc_count,
            clear_doc_index,
            get_game_notes,
            save_game_note,
            start_mcp_server,
            stop_mcp_server,
            get_mcp_status,
            get_mcp_tool_whitelist,
            set_mcp_tool_whitelist,
            set_whisper_config,
            get_whisper_status,
            transcribe_audio_whisper,
            download_whisper_model,
            canvas_collab_host,
            canvas_collab_join,
            canvas_collab_send,
            canvas_collab_broadcast,
            canvas_collab_status,
            canvas_collab_stop,
            discover_canvas_peers,
            save_profiles,
            load_profiles,
            dispatch_action,
            save_custom_themes,
            load_custom_themes,
            get_lan_ip,
            close_splashscreen,
            set_kiosk_mode,
            get_window_mode,
            start_oauth_flow,
            poll_oauth_token,
            run_onboarding_diagnostics,
            assemble_prompt_via_lua_cmd,
            optimize_raw_prompt,
            generate_jpe_explanation_with_level,
            save_prompt_preset,
            load_prompt_presets,
            remote_control::start_remote_server,
            remote_control::stop_remote_server,
            remote_control::get_remote_server_info,
            remote_control::remote_send_to_clients,
            remote_control::remote_relay_notification,
            sync::start_sync,
            sync::get_sync_status,
            sync::sync_now,
            sync::configure_sync,
            // ── Git Tab ────────────────────────────────────────────────────────
            git_list_repos,
            git_open_repo,
            git_clone,
            git_init,
            git_status,
            git_stage,
            git_unstage,
            git_discard,
            git_commit,
            git_log,
            git_branch_list,
            git_branch_create,
            git_branch_delete,
            git_branch_checkout,
            git_push,
            git_pull,
            git_fetch,
            git_diff,
            git_remote_list,
            git_remote_add,
            git_remote_remove,
            git_credential_store,
            git_credential_get,
            git_credential_delete,
            git_generate_ssh_key,
            git_ssh_public_keys,
            git_generate_commit_message,
            // ── API Lab Tab ────────────────────────────────────────────────────
            api_request,
            api_save_collection,
            api_load_collection,
            api_list_collections,
            api_delete_collection,
            api_generate_request,
            api_curl_import,
            api_export_curl,
            // ── CLI Maker Tab ──────────────────────────────────────────────────
            cli_list_commands,
            cli_create_command,
            cli_update_command,
            cli_delete_command,
            cli_run_command,
            cli_list_hooks,
            cli_toggle_hook,
            cli_export_lua,
            cli_import_lua,
            cli_maker_save_plugin,
            cli_maker_export,
            // ── Knowledge Graph ────────────────────────────────────────────────
            get_memory_graph_data,
            // ── Task Scheduler ─────────────────────────────────────────────────
            scheduler::list_scheduled_tasks,
            scheduler::add_scheduled_task,
            scheduler::delete_scheduled_task,
            scheduler::toggle_scheduled_task,
            scheduler::run_task_now,
            // ── Workflow Builder ───────────────────────────────────────────────
            workflow::list_workflows,
            workflow::load_workflow,
            workflow::save_workflow,
            workflow::delete_workflow,
            workflow::workflow_export,
            workflow::workflow_import,
            workflow::workflow_run,
            // ── Orchestrator ───────────────────────────────────────────────────
            orchestrator::start_orchestrated_task,
            orchestrator::get_orchestration_status,
            orchestrator::stop_orchestration,
            orchestrator::save_pipeline,
            orchestrator::load_pipelines,
            orchestrator::delete_pipeline,
            llm_oneshot,
            // ── Mini IDE ───────────────────────────────────────────────────────
            ide::list_workspace_files,
            ide::read_workspace_file,
            ide::write_workspace_file,
            ide::create_workspace_file,
            ide::delete_workspace_file,
            ide::rename_workspace_file,
            // ── DeckCode ───────────────────────────────────────────────────────
            crate::deckcode::deckcode_set_active_language,
            // ── LSP ────────────────────────────────────────────────────────────
            lsp::lsp_start,
            lsp::lsp_stop,
            lsp::lsp_list,
            lsp::lsp_get_diagnostics,
            lsp::lsp_open_document,
            lsp::lsp_close_document,
            lsp::lsp_change_document,
            lsp::lsp_get_completions,
            lsp::lsp_get_hover,
            lsp::lsp_get_definitions,
            lsp::lsp_known_servers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

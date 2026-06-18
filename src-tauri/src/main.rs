// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let config_root = app_lib::user_config_dir();
    let _ = std::fs::create_dir_all(&config_root);

    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    if let Err(e) = rt.block_on(app_lib::bridge::run_bridge_server(
        &config_root,
        &app_lib::get_config_path(),
    )) {
        eprintln!("Bridge server error: {}", e);
        std::process::exit(1);
    }
}

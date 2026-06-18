//! Integration test: sync status persistence and the `syncing` flag.
//!
//! Validates that `SyncStatus` round-trips through the on-disk status file
//! and that `syncing` defaults to `false`.

use app_lib::sync::SyncStatus;
use std::path::PathBuf;

fn temp_status_path(suffix: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "neurodeck_test_sync_status_{}_{}.json",
        std::process::id(),
        suffix
    ))
}

#[test]
fn sync_status_defaults_syncing_to_false() {
    let status = SyncStatus::default();
    assert!(!status.syncing);
}

#[test]
fn sync_status_serializes_and_deserializes() {
    let path = temp_status_path("roundtrip");
    let _ = std::fs::remove_file(&path);

    let status = SyncStatus {
        enabled: true,
        sync_memory: true,
        sync_sessions: false,
        api_base_url: "https://sync.example.com".to_string(),
        device_id: "device-123".to_string(),
        last_sync_at: Some("2026-06-12T12:00:00Z".to_string()),
        last_error: Some("boom".to_string()),
        pending_records: 7,
        pushed_records: 5,
        pulled_records: 3,
        conflict_count: 1,
        syncing: true,
    };

    let raw = serde_json::to_string_pretty(&status).expect("serialize");
    std::fs::write(&path, raw).expect("write status file");

    let loaded: SyncStatus =
        serde_json::from_str(&std::fs::read_to_string(&path).expect("read")).expect("deserialize");

    assert!(loaded.enabled);
    assert!(loaded.sync_memory);
    assert!(!loaded.sync_sessions);
    assert_eq!(loaded.api_base_url, "https://sync.example.com");
    assert_eq!(loaded.device_id, "device-123");
    assert_eq!(
        loaded.last_sync_at,
        Some("2026-06-12T12:00:00Z".to_string())
    );
    assert_eq!(loaded.last_error, Some("boom".to_string()));
    assert_eq!(loaded.pending_records, 7);
    assert_eq!(loaded.pushed_records, 5);
    assert_eq!(loaded.pulled_records, 3);
    assert_eq!(loaded.conflict_count, 1);
    assert!(loaded.syncing);

    let _ = std::fs::remove_file(&path);
}

//! Integration test: MemoryDB storage, search, and RAG ranking.

use app_lib::memory::MemoryDB;
use std::collections::HashMap;

fn temp_mem_dir(suffix: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "neurodeck_test_mem_{}_{}",
        std::process::id(),
        suffix
    ))
}

fn cleanup(dir: &std::path::Path) {
    let _ = std::fs::remove_dir_all(dir);
}

#[test]
fn memory_db_store_and_list() {
    let dir = temp_mem_dir("store");
    cleanup(&dir);

    let db = MemoryDB::init(&dir).expect("init should succeed");

    let mut meta = HashMap::new();
    meta.insert("role".to_string(), "user".to_string());

    db.store_message(
        "msg-1".to_string(),
        "hello world".to_string(),
        vec![1.0, 0.0, 0.0],
        meta.clone(),
    )
    .unwrap();

    let all = db.list_all().unwrap();
    assert_eq!(all.len(), 1);
    assert_eq!(all[0].id, "msg-1");
    assert_eq!(all[0].content, "hello world");

    cleanup(&dir);
}

#[test]
fn memory_search_ranking() {
    let dir = temp_mem_dir("ranking");
    cleanup(&dir);

    let db = MemoryDB::init(&dir).expect("init should succeed");

    let mut meta = HashMap::new();
    meta.insert("role".to_string(), "user".to_string());

    // Store three records with orthogonal embeddings
    db.store_message(
        "id1".to_string(),
        "hello world".to_string(),
        vec![1.0, 0.0, 0.0],
        meta.clone(),
    )
    .unwrap();

    db.store_message(
        "id2".to_string(),
        "rust programming".to_string(),
        vec![0.0, 1.0, 0.0],
        meta.clone(),
    )
    .unwrap();

    db.store_message(
        "id3".to_string(),
        "goodbye moon".to_string(),
        vec![0.0, 0.0, 1.0],
        meta.clone(),
    )
    .unwrap();

    // Query close to id1 should return id1 first
    let results = db.search(&[1.0, 0.1, 0.1], 2).unwrap();
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].id, "id1");

    // Query close to id2 should return id2 first
    let results = db.search(&[0.1, 1.0, 0.1], 2).unwrap();
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].id, "id2");

    cleanup(&dir);
}

#[test]
fn memory_search_skips_empty_embeddings() {
    let dir = temp_mem_dir("empty");
    cleanup(&dir);

    let db = MemoryDB::init(&dir).expect("init should succeed");

    let mut meta = HashMap::new();
    meta.insert("role".to_string(), "user".to_string());

    // Fact with no embedding (empty vec)
    db.store_message(
        "fact-1".to_string(),
        "A pinned fact".to_string(),
        vec![],
        meta.clone(),
    )
    .unwrap();

    // Normal message with embedding
    db.store_message(
        "msg-1".to_string(),
        "hello world".to_string(),
        vec![1.0, 0.0, 0.0],
        meta.clone(),
    )
    .unwrap();

    let results = db.search(&[1.0, 0.0, 0.0], 5).unwrap();
    // Should only return msg-1, not fact-1
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].id, "msg-1");

    cleanup(&dir);
}

#[test]
fn memory_persistence_across_init() {
    let dir = temp_mem_dir("persist");
    cleanup(&dir);

    // First init + store
    {
        let db = MemoryDB::init(&dir).expect("init should succeed");
        let mut meta = HashMap::new();
        meta.insert("role".to_string(), "assistant".to_string());
        db.store_message(
            "persist-1".to_string(),
            "survives restart".to_string(),
            vec![0.5, 0.5, 0.0],
            meta,
        )
        .unwrap();
    }

    // Second init should load from disk
    {
        let db = MemoryDB::init(&dir).expect("init should succeed");
        let all = db.list_all().unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, "persist-1");
        assert_eq!(all[0].content, "survives restart");
    }

    cleanup(&dir);
}

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tracing;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MemoryRecord {
    pub id: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pack_id: Option<String>,
    // Stored as BLOB in SQLite; serialised manually since sqlx doesn't natively map Vec<f32>.
    pub embedding: Vec<f32>,
    pub metadata: HashMap<String, String>,
}

/// In-memory + SQLite backed memory store.
///
/// When constructed with `from_pool`, all writes are persisted to SQLite and the
/// in-memory Vec is kept in sync for fast cosine-similarity search.
#[derive(Clone)]
pub struct MemoryDB {
    file_path: Option<PathBuf>,
    records: Arc<Mutex<Vec<MemoryRecord>>>,
    pool: Option<SqlitePool>,
}

impl MemoryDB {
    // ── Legacy JSON constructor (kept for bootSelfHeal fallback) ────────────

    pub fn init<P: AsRef<Path>>(dir: P) -> Result<Self, String> {
        let dir_ref = dir.as_ref();
        fs::create_dir_all(dir_ref)
            .map_err(|e| format!("Failed to create memory directory: {}", e))?;

        let file_path = dir_ref.join("chat_history.json");
        let mut records = Vec::new();

        if file_path.exists() {
            if let Ok(data) = fs::read_to_string(&file_path) {
                if let Ok(loaded) = serde_json::from_str::<Vec<MemoryRecord>>(&data) {
                    records = loaded;
                }
            }
        }

        Ok(Self {
            file_path: Some(file_path),
            records: Arc::new(Mutex::new(records)),
            pool: None,
        })
    }

    // ── SQLite constructor (production path) ────────────────────────────────

    pub async fn from_pool(pool: &SqlitePool) -> Result<Self, String> {
        let rows: Vec<SqliteMemoryRow> = sqlx::query_as(
            r#"
            SELECT id, namespace, content, embedding, metadata, pinned, project_id, pack_id
            FROM memory_records
            ORDER BY created_at
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to load memory from SQLite: {}", e))?;

        let records: Vec<MemoryRecord> = rows.into_iter().map(|r| r.into()).collect();
        tracing::info!("Loaded {} memory records from SQLite", records.len());

        Ok(Self {
            file_path: None,
            records: Arc::new(Mutex::new(records)),
            pool: Some(pool.clone()),
        })
    }

    /// One-shot migration: imports legacy JSON records into SQLite and renames
    /// the JSON file so the migration never runs again.
    pub async fn migrate_json_to_sqlite(&self, pool: &SqlitePool) -> Result<usize, String> {
        let legacy_path = match &self.file_path {
            Some(p) => p.clone(),
            None => return Ok(0),
        };

        if !legacy_path.exists() {
            return Ok(0);
        }

        let data = fs::read_to_string(&legacy_path)
            .map_err(|e| format!("Failed to read legacy memory JSON: {}", e))?;

        let legacy_records: Vec<MemoryRecord> = serde_json::from_str(&data)
            .map_err(|e| format!("Failed to parse legacy memory JSON: {}", e))?;

        let count = legacy_records.len();
        if count == 0 {
            let _ = fs::remove_file(&legacy_path);
            return Ok(0);
        }

        for rec in &legacy_records {
            if let Err(e) = insert_record_sqlite(pool, rec).await {
                tracing::warn!("Failed to migrate record {}: {}", rec.id, e);
            }
        }

        // Rename JSON file so migration is idempotent
        let backup = legacy_path.with_extension("json.migrated");
        let _ = fs::rename(&legacy_path, &backup);
        tracing::info!("Migrated {} legacy memory records to SQLite", count);

        Ok(count)
    }

    // ── Public API ──────────────────────────────────────────────────────────

    pub fn store_message(
        &self,
        id: String,
        content: String,
        embedding: Vec<f32>,
        metadata: HashMap<String, String>,
    ) -> Result<(), String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;

        records.retain(|r| r.id != id);
        records.push(MemoryRecord {
            id: id.clone(),
            content: content.clone(),
            project_id: None,
            pack_id: None,
            embedding: embedding.clone(),
            metadata: metadata.clone(),
        });

        // Persist
        if let Some(pool) = &self.pool {
            let rec = MemoryRecord {
                id,
                content,
                project_id: None,
                pack_id: None,
                embedding,
                metadata,
            };
            let pool = pool.clone();
            // Spawn fire-and-forget async write so the sync API signature is preserved.
            tokio::spawn(async move {
                if let Err(e) = insert_record_sqlite(&pool, &rec).await {
                    tracing::warn!("SQLite memory write failed: {}", e);
                }
            });
        } else if let Some(path) = &self.file_path {
            let serialized = serde_json::to_string_pretty(&*records)
                .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
            fs::write(path, serialized)
                .map_err(|e| format!("Failed to write memory database file: {}", e))?;
        }

        Ok(())
    }

    pub fn list_all(&self) -> Result<Vec<MemoryRecord>, String> {
        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        Ok(records.clone())
    }

    pub fn delete_record(&self, id: &str) -> Result<(), String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        let before = records.len();
        records.retain(|r| r.id != id);
        if records.len() == before {
            return Err(format!("Record '{}' not found", id));
        }

        if let Some(pool) = &self.pool {
            let id = id.to_string();
            let pool = pool.clone();
            tokio::spawn(async move {
                if let Err(e) = sqlx::query("DELETE FROM memory_records WHERE id = ?")
                    .bind(&id)
                    .execute(&pool)
                    .await
                {
                    tracing::warn!("SQLite memory delete failed: {}", e);
                }
            });
        } else if let Some(path) = &self.file_path {
            let serialized = serde_json::to_string_pretty(&*records)
                .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
            fs::write(path, serialized)
                .map_err(|e| format!("Failed to write memory database file: {}", e))?;
        }
        Ok(())
    }

    pub fn set_pinned(&self, id: &str, pinned: bool) -> Result<(), String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        let record = records
            .iter_mut()
            .find(|r| r.id == id)
            .ok_or_else(|| format!("Record '{}' not found", id))?;
        if pinned {
            record
                .metadata
                .insert("pinned".to_string(), "true".to_string());
        } else {
            record.metadata.remove("pinned");
        }

        if let Some(pool) = &self.pool {
            let id = id.to_string();
            let pinned_i = if pinned { 1 } else { 0 };
            let pool = pool.clone();
            tokio::spawn(async move {
                if let Err(e) = sqlx::query("UPDATE memory_records SET pinned = ? WHERE id = ?")
                    .bind(pinned_i)
                    .bind(&id)
                    .execute(&pool)
                    .await
                {
                    tracing::warn!("SQLite memory pin update failed: {}", e);
                }
            });
        } else if let Some(path) = &self.file_path {
            let serialized = serde_json::to_string_pretty(&*records)
                .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
            fs::write(path, serialized)
                .map_err(|e| format!("Failed to write memory database file: {}", e))?;
        }
        Ok(())
    }

    pub fn add_fact(&self, id: String, content: String) -> Result<(), String> {
        let mut metadata = HashMap::new();
        metadata.insert("role".to_string(), "fact".to_string());
        metadata.insert("pinned".to_string(), "true".to_string());
        self.store_message(id, content, vec![], metadata)
    }

    pub fn count_by_namespace(&self, namespace: &str) -> Result<usize, String> {
        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        Ok(records
            .iter()
            .filter(|r| r.metadata.get("namespace").map(|v| v.as_str()) == Some(namespace))
            .count())
    }

    pub fn delete_by_namespace(&self, namespace: &str) -> Result<usize, String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        let before = records.len();
        records.retain(|r| r.metadata.get("namespace").map(|v| v.as_str()) != Some(namespace));
        let removed = before - records.len();
        if removed > 0 {
            if let Some(pool) = &self.pool {
                let ns = namespace.to_string();
                let pool = pool.clone();
                tokio::spawn(async move {
                    if let Err(e) = sqlx::query("DELETE FROM memory_records WHERE namespace = ?")
                        .bind(&ns)
                        .execute(&pool)
                        .await
                    {
                        tracing::warn!("SQLite namespace delete failed: {}", e);
                    }
                });
            } else if let Some(path) = &self.file_path {
                let serialized = serde_json::to_string_pretty(&*records)
                    .map_err(|e| format!("Failed to serialize: {}", e))?;
                fs::write(path, serialized).map_err(|e| format!("Failed to write: {}", e))?;
            }
        }
        Ok(removed)
    }

    pub fn export_all_records(&self) -> Result<Vec<MemoryRecord>, String> {
        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        Ok(records.clone())
    }

    pub fn import_records(
        &self,
        incoming: Vec<MemoryRecord>,
        merge: bool,
    ) -> Result<usize, String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        let count = incoming.len();
        if merge {
            for rec in incoming {
                records.retain(|r| r.id != rec.id);
                records.push(rec);
            }
        } else {
            *records = incoming;
        }

        if let Some(pool) = &self.pool {
            let pool = pool.clone();
            let records_clone = records.clone();
            tokio::spawn(async move {
                if let Err(e) = sqlx::query("DELETE FROM memory_records")
                    .execute(&pool)
                    .await
                {
                    tracing::warn!("SQLite memory clear failed: {}", e);
                    return;
                }
                for rec in &records_clone {
                    if let Err(e) = insert_record_sqlite(&pool, rec).await {
                        tracing::warn!("SQLite memory import write failed: {}", e);
                    }
                }
            });
        } else if let Some(path) = &self.file_path {
            let serialized = serde_json::to_string_pretty(&*records)
                .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
            fs::write(path, serialized)
                .map_err(|e| format!("Failed to write memory database file: {}", e))?;
        }
        Ok(count)
    }

    pub fn search(
        &self,
        query_embedding: &[f32],
        limit: usize,
    ) -> Result<Vec<MemoryRecord>, String> {
        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;

        if records.is_empty() || query_embedding.is_empty() {
            return Ok(Vec::new());
        }

        let mut similarities: Vec<(f32, &MemoryRecord)> = records
            .iter()
            .filter(|r| !r.embedding.is_empty())
            .map(|record| {
                let sim = cosine_similarity(query_embedding, &record.embedding);
                (sim, record)
            })
            .collect();

        similarities.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        let results = similarities
            .into_iter()
            .take(limit)
            .map(|(_, record)| record.clone())
            .collect();

        Ok(results)
    }

    pub fn search_mmr(
        &self,
        query_embedding: &[f32],
        limit: usize,
        lambda: f32,
        fetch: usize,
    ) -> Result<Vec<MemoryRecord>, String> {
        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;

        if records.is_empty() || query_embedding.is_empty() {
            return Ok(Vec::new());
        }

        let candidates: Vec<(f32, &MemoryRecord)> = {
            let mut v: Vec<(f32, &MemoryRecord)> = records
                .iter()
                .filter(|r| !r.embedding.is_empty())
                .map(|r| (cosine_similarity(query_embedding, &r.embedding), r))
                .collect();
            v.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
            v.into_iter().take(fetch).collect()
        };

        if candidates.is_empty() {
            return Ok(Vec::new());
        }

        let limit = limit.min(candidates.len());
        let mut selected_indices: Vec<usize> = Vec::with_capacity(limit);

        selected_indices.push(0);

        while selected_indices.len() < limit {
            let mut best_score = f32::NEG_INFINITY;
            let mut best_idx = 0;

            for (i, (rel_sim, rec)) in candidates.iter().enumerate() {
                if selected_indices.contains(&i) {
                    continue;
                }
                let max_red = selected_indices
                    .iter()
                    .map(|&j| cosine_similarity(&rec.embedding, &candidates[j].1.embedding))
                    .fold(f32::NEG_INFINITY, f32::max);

                let mmr = lambda * rel_sim - (1.0 - lambda) * max_red;
                if mmr > best_score {
                    best_score = mmr;
                    best_idx = i;
                }
            }
            selected_indices.push(best_idx);
        }

        Ok(selected_indices
            .into_iter()
            .map(|i| candidates[i].1.clone())
            .collect())
    }
}

// ── SQLite helpers ─────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
pub struct SqliteMemoryRow {
    id: String,
    namespace: String,
    content: String,
    project_id: Option<String>,
    pack_id: Option<String>,
    embedding: Option<Vec<u8>>,
    metadata: Option<String>,
    pinned: i32,
}

impl From<SqliteMemoryRow> for MemoryRecord {
    fn from(row: SqliteMemoryRow) -> Self {
        let embedding = row
            .embedding
            .map(|bytes| {
                bytes
                    .chunks_exact(4)
                    .map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
                    .collect()
            })
            .unwrap_or_default();

        let metadata = row
            .metadata
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        let mut rec = MemoryRecord {
            id: row.id,
            content: row.content,
            project_id: row.project_id,
            pack_id: row.pack_id,
            embedding,
            metadata,
        };

        if row.pinned == 1 {
            rec.metadata
                .insert("pinned".to_string(), "true".to_string());
        }
        rec
    }
}

async fn insert_record_sqlite<'e, E>(executor: E, rec: &MemoryRecord) -> Result<(), String>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let namespace = rec.metadata.get("namespace").cloned().unwrap_or_default();
    let pinned = if rec.metadata.get("pinned") == Some(&"true".to_string()) {
        1
    } else {
        0
    };
    let embedding_bytes: Vec<u8> = rec.embedding.iter().flat_map(|f| f.to_le_bytes()).collect();
    let metadata_json =
        serde_json::to_string(&rec.metadata).map_err(|e| format!("JSON error: {}", e))?;

    sqlx::query(
        r#"
        INSERT INTO memory_records (id, namespace, content, project_id, pack_id, embedding, metadata, pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            namespace = excluded.namespace,
            content = excluded.content,
            project_id = excluded.project_id,
            pack_id = excluded.pack_id,
            embedding = excluded.embedding,
            metadata = excluded.metadata,
            pinned = excluded.pinned
        "#,
    )
    .bind(&rec.id)
    .bind(&namespace)
    .bind(&rec.content)
    .bind(&rec.project_id)
    .bind(&rec.pack_id)
    .bind(&embedding_bytes)
    .bind(&metadata_json)
    .bind(pinned)
    .execute(executor)
    .await
    .map_err(|e| format!("SQLite insert failed: {}", e))?;

    Ok(())
}

// ── Math ───────────────────────────────────────────────────────────────────

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let mut dot_product = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;

    for i in 0..a.len() {
        dot_product += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a.sqrt() * norm_b.sqrt())
}

// ── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 1e-6);

        let c = vec![0.0, 1.0, 0.0];
        assert!((cosine_similarity(&a, &c) - 0.0).abs() < 1e-6);

        let d = vec![-1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &d) + 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_memory_db_flow() {
        let temp_dir = std::env::temp_dir().join("neurodeck_test_mem");
        if temp_dir.exists() {
            let _ = std::fs::remove_dir_all(&temp_dir);
        }

        let db = MemoryDB::init(&temp_dir).unwrap();
        let mut metadata = HashMap::new();
        metadata.insert("role".to_string(), "user".to_string());

        db.store_message(
            "id1".to_string(),
            "hello world".to_string(),
            vec![1.0, 0.0, 0.0],
            metadata.clone(),
        )
        .unwrap();

        db.store_message(
            "id2".to_string(),
            "cyberpunk hacking".to_string(),
            vec![0.0, 1.0, 0.0],
            metadata.clone(),
        )
        .unwrap();

        let results = db.search(&[1.0, 0.1, 0.0], 1).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "id1");
        assert_eq!(results[0].content, "hello world");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

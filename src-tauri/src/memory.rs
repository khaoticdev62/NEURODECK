use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MemoryRecord {
    pub id: String,
    pub content: String,
    pub embedding: Vec<f32>,
    pub metadata: HashMap<String, String>,
}

#[derive(Clone)]
pub struct MemoryDB {
    file_path: PathBuf,
    records: Arc<Mutex<Vec<MemoryRecord>>>,
}

impl MemoryDB {
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
            file_path,
            records: Arc::new(Mutex::new(records)),
        })
    }

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

        // Remove existing record if ID matches
        records.retain(|r| r.id != id);

        records.push(MemoryRecord {
            id,
            content,
            embedding,
            metadata,
        });

        // Save to file
        let serialized = serde_json::to_string_pretty(&*records)
            .map_err(|e| format!("Failed to serialize memory records: {}", e))?;

        fs::write(&self.file_path, serialized)
            .map_err(|e| format!("Failed to write memory database file: {}", e))?;

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
        let serialized = serde_json::to_string_pretty(&*records)
            .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
        fs::write(&self.file_path, serialized)
            .map_err(|e| format!("Failed to write memory database file: {}", e))?;
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
        let serialized = serde_json::to_string_pretty(&*records)
            .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
        fs::write(&self.file_path, serialized)
            .map_err(|e| format!("Failed to write memory database file: {}", e))?;
        Ok(())
    }

    /// Store a manually written fact with a pinned marker and no embedding.
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
            let serialized = serde_json::to_string_pretty(&*records)
                .map_err(|e| format!("Failed to serialize: {}", e))?;
            fs::write(&self.file_path, serialized)
                .map_err(|e| format!("Failed to write: {}", e))?;
        }
        Ok(removed)
    }

    /// Returns a clone of all records for external export.
    pub fn export_all_records(&self) -> Result<Vec<MemoryRecord>, String> {
        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock memory DB")?;
        Ok(records.clone())
    }

    /// Imports a set of records. `merge=true` deduplicates by ID; `merge=false` replaces all.
    pub fn import_records(&self, incoming: Vec<MemoryRecord>, merge: bool) -> Result<usize, String> {
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
        let serialized = serde_json::to_string_pretty(&*records)
            .map_err(|e| format!("Failed to serialize memory records: {}", e))?;
        fs::write(&self.file_path, serialized)
            .map_err(|e| format!("Failed to write memory database file: {}", e))?;
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

        // Skip records with no embedding (e.g. manually-added facts) so they
        // don't surface as 0.0-similarity entries and pollute RAG top-N results.
        let mut similarities: Vec<(f32, &MemoryRecord)> = records
            .iter()
            .filter(|r| !r.embedding.is_empty())
            .map(|record| {
                let sim = cosine_similarity(query_embedding, &record.embedding);
                (sim, record)
            })
            .collect();

        // Sort by similarity descending
        similarities.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        // Take top limit
        let results = similarities
            .into_iter()
            .take(limit)
            .map(|(_, record)| record.clone())
            .collect();

        Ok(results)
    }

    /// Maximal Marginal Relevance search: retrieve `fetch` candidates by cosine
    /// similarity, then iteratively select the `limit` results that maximize
    /// relevance while minimising redundancy between selected chunks.
    ///
    /// `lambda` (0–1): 1.0 = pure relevance, 0.0 = pure diversity. Default 0.5.
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

        // First pick: highest relevance
        selected_indices.push(0);

        while selected_indices.len() < limit {
            let mut best_score = f32::NEG_INFINITY;
            let mut best_idx = 0;

            for (i, (rel_sim, rec)) in candidates.iter().enumerate() {
                if selected_indices.contains(&i) {
                    continue;
                }
                // Max similarity to already-selected chunks
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

        // Search closest to [1.0, 0.1, 0.0] -> should be "hello world"
        let results = db.search(&[1.0, 0.1, 0.0], 1).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "id1");
        assert_eq!(results[0].content, "hello world");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

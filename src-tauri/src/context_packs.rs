use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct ContextPack {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub privacy_level: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct ContextPackWithCount {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub privacy_level: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub memory_count: i64,
}

#[derive(Clone)]
pub struct PackDB {
    pool: Arc<SqlitePool>,
}

impl PackDB {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool: Arc::new(pool),
        }
    }

    pub async fn create(
        &self,
        id: String,
        name: String,
        description: Option<String>,
        color: Option<String>,
        privacy_level: Option<String>,
    ) -> Result<ContextPack, String> {
        let pool = &*self.pool;
        let color = color.unwrap_or_else(|| "#10b981".to_string());
        let privacy = privacy_level.unwrap_or_else(|| "standard".to_string());
        sqlx::query(
            r#"
            INSERT INTO context_packs (id, name, description, color, privacy_level)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&name)
        .bind(&description)
        .bind(&color)
        .bind(&privacy)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create context pack: {}", e))?;

        Ok(ContextPack {
            id,
            name,
            description,
            color: Some(color),
            privacy_level: Some(privacy),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        })
    }

    pub async fn list(&self) -> Result<Vec<ContextPackWithCount>, String> {
        let pool = &*self.pool;
        let rows: Vec<ContextPackWithCount> = sqlx::query_as(
            r#"
            SELECT
                p.id,
                p.name,
                p.description,
                p.color,
                p.privacy_level,
                p.created_at,
                p.updated_at,
                COUNT(DISTINCT m.id) as memory_count
            FROM context_packs p
            LEFT JOIN memory_records m ON m.pack_id = p.id
            GROUP BY p.id
            ORDER BY p.updated_at DESC
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to list context packs: {}", e))?;

        Ok(rows)
    }

    pub async fn get(&self, id: &str) -> Result<Option<ContextPack>, String> {
        let pool = &*self.pool;
        let row: Option<ContextPack> = sqlx::query_as(
            r#"
            SELECT id, name, description, color, privacy_level, created_at, updated_at
            FROM context_packs
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to get context pack: {}", e))?;

        Ok(row)
    }

    pub async fn update(
        &self,
        id: &str,
        name: Option<String>,
        description: Option<String>,
        color: Option<String>,
        privacy_level: Option<String>,
    ) -> Result<(), String> {
        let pool = &*self.pool;

        if let Some(name) = name {
            sqlx::query(
                "UPDATE context_packs SET name = ?, updated_at = datetime('now') WHERE id = ?",
            )
            .bind(&name)
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update pack name: {}", e))?;
        }
        if let Some(description) = description {
            sqlx::query("UPDATE context_packs SET description = ?, updated_at = datetime('now') WHERE id = ?")
                .bind(&description)
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update pack description: {}", e))?;
        }
        if let Some(color) = color {
            sqlx::query(
                "UPDATE context_packs SET color = ?, updated_at = datetime('now') WHERE id = ?",
            )
            .bind(&color)
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update pack color: {}", e))?;
        }
        if let Some(privacy_level) = privacy_level {
            sqlx::query("UPDATE context_packs SET privacy_level = ?, updated_at = datetime('now') WHERE id = ?")
                .bind(&privacy_level)
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update pack privacy_level: {}", e))?;
        }

        Ok(())
    }

    pub async fn delete(&self, id: &str) -> Result<(), String> {
        let pool = &*self.pool;
        sqlx::query("DELETE FROM context_packs WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to delete context pack: {}", e))?;
        Ok(())
    }

    pub async fn set_memory_pack(
        &self,
        memory_id: &str,
        pack_id: Option<String>,
    ) -> Result<(), String> {
        let pool = &*self.pool;
        sqlx::query("UPDATE memory_records SET pack_id = ? WHERE id = ?")
            .bind(&pack_id)
            .bind(memory_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to set memory pack: {}", e))?;
        Ok(())
    }

    pub async fn get_pack_memory(
        &self,
        pack_id: &str,
    ) -> Result<Vec<crate::memory::MemoryRecord>, String> {
        let pool = &*self.pool;
        let rows: Vec<crate::memory::SqliteMemoryRow> = sqlx::query_as(
            r#"
            SELECT id, namespace, content, embedding, metadata, pinned
            FROM memory_records
            WHERE pack_id = ?
            ORDER BY created_at DESC
            "#,
        )
        .bind(pack_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to get pack memory: {}", e))?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        sqlx::query(
            r#"
            CREATE TABLE context_packs (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT DEFAULT '#10b981',
                privacy_level TEXT DEFAULT 'standard',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE memory_records (
                id TEXT PRIMARY KEY NOT NULL,
                namespace TEXT NOT NULL DEFAULT 'default',
                content TEXT NOT NULL,
                embedding BLOB,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                pinned INTEGER NOT NULL DEFAULT 0,
                project_id TEXT,
                pack_id TEXT,
                privacy_level TEXT DEFAULT 'standard'
            );
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn test_pack_crud() {
        let pool = test_pool().await;
        let db = PackDB::new(pool);

        let pack = db
            .create("p1".to_string(), "Test Pack".to_string(), None, None, None)
            .await
            .unwrap();
        assert_eq!(pack.name, "Test Pack");
        assert_eq!(pack.color.unwrap(), "#10b981");

        let list = db.list().await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Test Pack");

        db.update("p1", Some("Updated".to_string()), None, None, None)
            .await
            .unwrap();
        let updated = db.get("p1").await.unwrap().unwrap();
        assert_eq!(updated.name, "Updated");

        db.delete("p1").await.unwrap();
        assert!(db.get("p1").await.unwrap().is_none());
    }
}

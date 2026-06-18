use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct ProjectSession {
    pub id: String,
    pub name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub model: Option<String>,
    pub provider: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct ProjectWithCounts {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub session_count: i64,
    pub memory_count: i64,
}

#[derive(Clone)]
pub struct ProjectDB {
    pool: Arc<SqlitePool>,
}

impl ProjectDB {
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
    ) -> Result<Project, String> {
        let pool = &*self.pool;
        let color = color.unwrap_or_else(|| "#3b82f6".to_string());
        sqlx::query(
            r#"
            INSERT INTO projects (id, name, description, color)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&name)
        .bind(&description)
        .bind(&color)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create project: {}", e))?;

        Ok(Project {
            id,
            name,
            description,
            color: Some(color),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        })
    }

    pub async fn list(&self) -> Result<Vec<ProjectWithCounts>, String> {
        let pool = &*self.pool;
        let rows: Vec<ProjectWithCounts> = sqlx::query_as(
            r#"
            SELECT
                p.id,
                p.name,
                p.description,
                p.color,
                p.created_at,
                p.updated_at,
                COUNT(DISTINCT s.id) as session_count,
                COUNT(DISTINCT m.id) as memory_count
            FROM projects p
            LEFT JOIN sessions s ON s.project_id = p.id
            LEFT JOIN memory_records m ON m.project_id = p.id
            GROUP BY p.id
            ORDER BY p.updated_at DESC
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to list projects: {}", e))?;

        Ok(rows)
    }

    pub async fn get(&self, id: &str) -> Result<Option<Project>, String> {
        let pool = &*self.pool;
        let row: Option<Project> = sqlx::query_as(
            r#"
            SELECT id, name, description, color, created_at, updated_at
            FROM projects
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to get project: {}", e))?;

        Ok(row)
    }

    pub async fn update(
        &self,
        id: &str,
        name: Option<String>,
        description: Option<String>,
        color: Option<String>,
    ) -> Result<(), String> {
        let pool = &*self.pool;

        if let Some(name) = name {
            sqlx::query("UPDATE projects SET name = ?, updated_at = datetime('now') WHERE id = ?")
                .bind(&name)
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update project name: {}", e))?;
        }
        if let Some(description) = description {
            sqlx::query(
                "UPDATE projects SET description = ?, updated_at = datetime('now') WHERE id = ?",
            )
            .bind(&description)
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update project description: {}", e))?;
        }
        if let Some(color) = color {
            sqlx::query("UPDATE projects SET color = ?, updated_at = datetime('now') WHERE id = ?")
                .bind(&color)
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update project color: {}", e))?;
        }

        Ok(())
    }

    pub async fn delete(&self, id: &str) -> Result<(), String> {
        let pool = &*self.pool;
        sqlx::query("DELETE FROM projects WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to delete project: {}", e))?;
        Ok(())
    }

    pub async fn set_session_project(
        &self,
        session_id: &str,
        project_id: Option<String>,
    ) -> Result<(), String> {
        let pool = &*self.pool;
        sqlx::query("UPDATE sessions SET project_id = ? WHERE id = ?")
            .bind(&project_id)
            .bind(session_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to set session project: {}", e))?;
        Ok(())
    }

    pub async fn set_memory_project(
        &self,
        memory_id: &str,
        project_id: Option<String>,
    ) -> Result<(), String> {
        let pool = &*self.pool;
        sqlx::query("UPDATE memory_records SET project_id = ? WHERE id = ?")
            .bind(&project_id)
            .bind(memory_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to set memory project: {}", e))?;
        Ok(())
    }

    pub async fn get_project_sessions(
        &self,
        project_id: &str,
    ) -> Result<Vec<ProjectSession>, String> {
        let pool = &*self.pool;
        let rows: Vec<ProjectSession> = sqlx::query_as(
            r#"
            SELECT id, name, created_at, updated_at, model, provider
            FROM sessions
            WHERE project_id = ?
            ORDER BY updated_at DESC
            "#,
        )
        .bind(project_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to get project sessions: {}", e))?;

        Ok(rows)
    }

    pub async fn get_project_memory(
        &self,
        project_id: &str,
    ) -> Result<Vec<crate::memory::MemoryRecord>, String> {
        let pool = &*self.pool;
        let rows: Vec<crate::memory::SqliteMemoryRow> = sqlx::query_as(
            r#"
            SELECT id, namespace, content, embedding, metadata, pinned
            FROM memory_records
            WHERE project_id = ?
            ORDER BY created_at DESC
            "#,
        )
        .bind(project_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to get project memory: {}", e))?;

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
            CREATE TABLE projects (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT DEFAULT '#3b82f6',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                model TEXT,
                provider TEXT,
                project_id TEXT
            );
            CREATE TABLE memory_records (
                id TEXT PRIMARY KEY NOT NULL,
                namespace TEXT NOT NULL DEFAULT 'default',
                content TEXT NOT NULL,
                embedding BLOB,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                pinned INTEGER NOT NULL DEFAULT 0,
                project_id TEXT
            );
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn test_project_crud() {
        let pool = test_pool().await;
        let db = ProjectDB::new(pool);

        let project = db
            .create("p1".to_string(), "Test Project".to_string(), None, None)
            .await
            .unwrap();
        assert_eq!(project.name, "Test Project");
        assert_eq!(project.color.unwrap(), "#3b82f6");

        let list = db.list().await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Test Project");

        db.update("p1", Some("Updated".to_string()), None, None)
            .await
            .unwrap();
        let updated = db.get("p1").await.unwrap().unwrap();
        assert_eq!(updated.name, "Updated");

        db.delete("p1").await.unwrap();
        assert!(db.get("p1").await.unwrap().is_none());
    }
}

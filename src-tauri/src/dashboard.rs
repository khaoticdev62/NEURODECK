use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::path::Path;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DashboardStats {
    pub sessions_total: i64,
    pub messages_total: i64,
    pub memory_total: i64,
    pub memory_pinned: i64,
    pub projects_total: i64,
    pub packs_total: i64,
    pub provider: String,
    pub model: String,
    pub db_size_bytes: u64,
    pub privacy_breakdown: PrivacyBreakdown,
    pub recent_sessions: Vec<RecentSession>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PrivacyBreakdown {
    pub standard: i64,
    pub private: i64,
    pub sensitive: i64,
    pub sealed: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct RecentSession {
    pub id: String,
    pub name: Option<String>,
    pub created_at: String,
    pub message_count: i64,
}

#[derive(Clone)]
pub struct DashboardDB {
    pool: Arc<SqlitePool>,
    db_path: std::path::PathBuf,
}

impl DashboardDB {
    pub fn new(pool: SqlitePool, db_path: &Path) -> Self {
        Self {
            pool: Arc::new(pool),
            db_path: db_path.to_path_buf(),
        }
    }

    pub async fn get_stats(&self, provider: &str, model: &str) -> Result<DashboardStats, String> {
        let pool = &*self.pool;

        let sessions_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sessions")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

        let messages_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM messages")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

        let memory_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM memory_records")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

        let memory_pinned: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM memory_records WHERE pinned = 1")
                .fetch_one(pool)
                .await
                .map_err(|e| e.to_string())?;

        let projects_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

        let packs_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM context_packs")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

        let standard: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM memory_records WHERE COALESCE(privacy_level, 'standard') = 'standard'")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;
        let private: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM memory_records WHERE privacy_level = 'private'",
        )
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
        let sensitive: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM memory_records WHERE privacy_level = 'sensitive'",
        )
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
        let sealed: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM memory_records WHERE privacy_level = 'sealed'",
        )
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        let recent_sessions: Vec<RecentSession> = sqlx::query_as(
            r#"
            SELECT s.id, s.name, s.created_at, COUNT(m.id) as message_count
            FROM sessions s
            LEFT JOIN messages m ON m.session_id = s.id
            GROUP BY s.id
            ORDER BY s.updated_at DESC
            LIMIT 5
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        let db_size_bytes = std::fs::metadata(&self.db_path)
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(DashboardStats {
            sessions_total,
            messages_total,
            memory_total,
            memory_pinned,
            projects_total,
            packs_total,
            provider: provider.to_string(),
            model: model.to_string(),
            db_size_bytes,
            privacy_breakdown: PrivacyBreakdown {
                standard,
                private,
                sensitive,
                sealed,
            },
            recent_sessions,
        })
    }
}

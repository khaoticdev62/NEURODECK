//! NEURODECK SQLite persistence layer.
//!
//! Bootstrap: `DbPool::open(config_root)` creates the database at
//! `<config_root>/neurodeck.db` and runs pending migrations.

use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::path::Path;
use tracing;

pub mod migrations;

/// Managed database handle — cloneable cheap reference to the pool.
#[derive(Clone, Debug)]
pub struct DbPool {
    pub pool: SqlitePool,
    pub db_path: std::path::PathBuf,
}

impl DbPool {
    /// Open (or create) the SQLite database and run migrations.
    pub async fn open(config_root: &Path) -> Result<Self, sqlx::Error> {
        let db_path = config_root.join("neurodeck.db");
        let _ = std::fs::create_dir_all(config_root);

        tracing::info!("Opening SQLite database at {}", db_path.display());

        let options = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

        let pool = SqlitePool::connect_with(options).await?;

        // Ensure schema_migrations table exists
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (datetime('now')),
                description TEXT
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Run embedded migrations
        migrations::run_all(&pool).await?;

        tracing::info!("SQLite database ready");
        Ok(DbPool { pool, db_path })
    }

    /// Convenience: run a health check query.
    pub async fn health(&self) -> Result<String, sqlx::Error> {
        let row: (String,) = sqlx::query_as("SELECT sqlite_version()")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }
}

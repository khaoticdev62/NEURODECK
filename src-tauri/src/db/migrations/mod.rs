//! Embedded migration runner for NEURODECK SQLite.
//!
//! Migrations are SQL files named `###_description.sql`.
//! Each file must start with a comment `-- migrate:up` (optional convention).
//! The version number is the leading numeric prefix.

use sqlx::SqlitePool;
use tracing;

struct Migration {
    version: i64,
    name: &'static str,
    sql: &'static str,
}

/// Ordered list of all migrations.
static MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        sql: include_str!("001_initial_schema.sql"),
    },
    Migration {
        version: 2,
        name: "project_knowledge",
        sql: include_str!("002_project_knowledge.sql"),
    },
    Migration {
        version: 3,
        name: "context_packs",
        sql: include_str!("003_context_packs.sql"),
    },
];

pub async fn run_all(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    for mig in MIGRATIONS {
        let already_applied: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?)",
        )
        .bind(mig.version)
        .fetch_one(pool)
        .await?;

        if already_applied {
            continue;
        }

        tracing::info!("Applying migration {}: {}", mig.version, mig.name);

        let mut tx = pool.begin().await?;
        sqlx::raw_sql(mig.sql).execute(&mut *tx).await?;
        sqlx::query("INSERT INTO schema_migrations (version, description) VALUES (?, ?)")
            .bind(mig.version)
            .bind(mig.name)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;

        tracing::info!("Migration {} applied", mig.version);
    }

    Ok(())
}

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub id: String,
    pub source: String, // 'messages', 'memory_records', 'projects'
    pub title: String,
    pub snippet: String,
    pub project_id: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResults {
    pub messages: Vec<SearchResult>,
    pub memory: Vec<SearchResult>,
    pub projects: Vec<SearchResult>,
}

#[derive(Clone)]
pub struct SearchEngine {
    pool: Arc<SqlitePool>,
}

impl SearchEngine {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool: Arc::new(pool),
        }
    }

    pub async fn universal_search(
        &self,
        query: &str,
        limit: i64,
        source_filter: Option<String>,
        project_id: Option<String>,
    ) -> Result<SearchResults, String> {
        if query.trim().is_empty() {
            return Ok(SearchResults {
                messages: vec![],
                memory: vec![],
                projects: vec![],
            });
        }

        let pool = &*self.pool;
        let q = format!("{}*", query.trim());

        let mut messages: Vec<SearchResult> = vec![];
        let mut memory: Vec<SearchResult> = vec![];
        let mut projects: Vec<SearchResult> = vec![];

        // Search messages
        if source_filter.as_deref().unwrap_or("") == ""
            || source_filter.as_deref() == Some("messages")
        {
            let rows = sqlx::query_as::<_, SearchRow>(
                r#"
                SELECT
                    m.id as id,
                    'messages' as source,
                    COALESCE(s.name, m.session_id) as title,
                    snippet(search_index, 0, '<mark>', '</mark>', '...', 32) as snippet,
                    m.project_id as project_id,
                    m.created_at as created_at
                FROM search_index si
                JOIN messages m ON m.id = si.source_id
                LEFT JOIN sessions s ON s.id = m.session_id
                WHERE search_index MATCH ? AND si.source_table = 'messages'
                ORDER BY rank
                LIMIT ?
                "#,
            )
            .bind(&q)
            .bind(limit)
            .fetch_all(pool)
            .await;

            if let Ok(rows) = rows {
                messages = rows
                    .into_iter()
                    .filter(|r: &SearchRow| {
                        project_id
                            .as_ref()
                            .map(|p| r.project_id.as_ref() == Some(p))
                            .unwrap_or(true)
                    })
                    .map(|r| r.into_result())
                    .collect();
            }
        }

        // Search memory
        if source_filter.as_deref().unwrap_or("") == ""
            || source_filter.as_deref() == Some("memory")
        {
            let rows = sqlx::query_as::<_, SearchRow>(
                r#"
                SELECT
                    m.id as id,
                    'memory_records' as source,
                    substr(m.content, 1, 60) as title,
                    snippet(search_index, 0, '<mark>', '</mark>', '...', 32) as snippet,
                    m.project_id as project_id,
                    m.created_at as created_at
                FROM search_index si
                JOIN memory_records m ON m.id = si.source_id
                WHERE search_index MATCH ? AND si.source_table = 'memory_records'
                ORDER BY rank
                LIMIT ?
                "#,
            )
            .bind(&q)
            .bind(limit)
            .fetch_all(pool)
            .await;

            if let Ok(rows) = rows {
                memory = rows
                    .into_iter()
                    .filter(|r: &SearchRow| {
                        project_id
                            .as_ref()
                            .map(|p| r.project_id.as_ref() == Some(p))
                            .unwrap_or(true)
                    })
                    .map(|r| r.into_result())
                    .collect();
            }
        }

        // Search projects
        if source_filter.as_deref().unwrap_or("") == ""
            || source_filter.as_deref() == Some("projects")
        {
            let rows = sqlx::query_as::<_, SearchRow>(
                r#"
                SELECT
                    p.id as id,
                    'projects' as source,
                    p.name as title,
                    snippet(search_index, 0, '<mark>', '</mark>', '...', 32) as snippet,
                    NULL as project_id,
                    p.created_at as created_at
                FROM search_index si
                JOIN projects p ON p.id = si.source_id
                WHERE search_index MATCH ? AND si.source_table = 'projects'
                ORDER BY rank
                LIMIT ?
                "#,
            )
            .bind(&q)
            .bind(limit)
            .fetch_all(pool)
            .await;

            if let Ok(rows) = rows {
                projects = rows.into_iter().map(|r| r.into_result()).collect();
            }
        }

        Ok(SearchResults {
            messages,
            memory,
            projects,
        })
    }
}

#[derive(sqlx::FromRow)]
struct SearchRow {
    id: String,
    source: String,
    title: String,
    snippet: String,
    project_id: Option<String>,
    created_at: Option<String>,
}

impl SearchRow {
    fn into_result(self) -> SearchResult {
        SearchResult {
            id: self.id,
            source: self.source,
            title: self.title,
            snippet: self.snippet,
            project_id: self.project_id,
            created_at: self.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        sqlx::query(
            r#"
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                model TEXT,
                provider TEXT,
                project_id TEXT
            );
            CREATE TABLE messages (
                id TEXT PRIMARY KEY NOT NULL,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                metadata TEXT
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
            CREATE TABLE projects (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT DEFAULT '#3b82f6',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE VIRTUAL TABLE search_index USING fts5(
                content,
                source_table,
                source_id,
                tokenize = 'porter'
            );
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn test_universal_search() {
        let pool = test_pool().await;
        let engine = SearchEngine::new(pool.clone());

        // Insert test data
        sqlx::query("INSERT INTO messages (id, session_id, role, content) VALUES ('m1', 's1', 'user', 'hello world rust')")
            .execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO memory_records (id, namespace, content) VALUES ('mem1', 'default', 'rust programming memory')")
            .execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO projects (id, name, description) VALUES ('p1', 'Rust Project', 'A project about rust')")
            .execute(&pool).await.unwrap();

        // Insert into search_index
        sqlx::query("INSERT INTO search_index (content, source_table, source_id) VALUES ('hello world rust', 'messages', 'm1')")
            .execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO search_index (content, source_table, source_id) VALUES ('rust programming memory', 'memory_records', 'mem1')")
            .execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO search_index (content, source_table, source_id) VALUES ('Rust Project A project about rust', 'projects', 'p1')")
            .execute(&pool).await.unwrap();

        let results = engine
            .universal_search("rust", 10, None, None)
            .await
            .unwrap();
        assert!(
            !results.messages.is_empty()
                || !results.memory.is_empty()
                || !results.projects.is_empty()
        );

        // Test source filter
        let mem_only = engine
            .universal_search("rust", 10, Some("memory".to_string()), None)
            .await
            .unwrap();
        assert_eq!(mem_only.messages.len(), 0);
        assert!(!mem_only.memory.is_empty());
    }
}

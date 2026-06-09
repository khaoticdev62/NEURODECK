use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::SqlitePool;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptPack {
    pub id: String,
    pub title: String,
    pub description: String,
    pub templates: Vec<PromptTemplate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub id: String,
    pub pack_id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub agent_hint: Option<String>,
    pub slots: Vec<PromptSlot>,
    pub template: String,
    pub risk_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptSlot {
    pub id: String,
    pub label: String,
    pub required: bool,
    pub kind: String,
    pub default: Option<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroDefinition {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub steps: Vec<MacroStep>,
    pub risk_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroStep {
    pub kind: String,
    pub timestamp: String,
    pub payload: Value,
    pub requires_confirmation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    pub id: String,
    pub label: String,
    pub source: String,
    pub insert_text: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotValidationResult {
    pub valid: bool,
    pub missing_slots: Vec<String>,
    pub errors: Vec<String>,
    pub rendered_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedPrompt {
    pub id: String,
    pub title: String,
    pub template_id: Option<String>,
    pub pack_id: Option<String>,
    pub slot_values: Value,
    pub prompt: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
struct PackFile {
    packs: Vec<PromptPack>,
}

#[derive(Debug, sqlx::FromRow)]
struct SavedPromptRow {
    id: String,
    title: String,
    template_id: Option<String>,
    pack_id: Option<String>,
    slot_values: String,
    prompt: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, sqlx::FromRow)]
struct MacroRow {
    id: String,
    name: String,
    created_at: String,
    steps: String,
    risk_level: String,
}

pub fn load_builtin_packs() -> Result<Vec<PromptPack>, String> {
    let dir = prompt_pack_dir();
    let mut packs = Vec::new();

    if dir.exists() {
        for entry in
            fs::read_dir(&dir).map_err(|e| format!("Failed to read prompt packs: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read prompt pack entry: {}", e))?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let raw = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
            let parsed = parse_pack_file(&raw, &path.display().to_string())?;
            packs.extend(parsed.packs);
        }
    }

    validate_packs(&packs)?;
    Ok(packs)
}

fn prompt_pack_dir() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .map(|p| p.join("assets").join("prompt-packs"))
        .unwrap_or_else(|| manifest_dir.join("assets").join("prompt-packs"))
}

pub fn validate_packs(packs: &[PromptPack]) -> Result<(), String> {
    let mut pack_ids = HashSet::new();
    let mut template_ids = HashSet::new();

    for pack in packs {
        if pack.id.trim().is_empty() {
            return Err("Prompt pack id cannot be empty".to_string());
        }
        validate_lookup_id("pack_id", &pack.id)?;
        if !pack_ids.insert(pack.id.clone()) {
            return Err(format!("Duplicate prompt pack id: {}", pack.id));
        }
        for template in &pack.templates {
            if template.id.trim().is_empty() {
                return Err(format!("Prompt pack {} has an empty template id", pack.id));
            }
            validate_lookup_id("template_id", &template.id)?;
            validate_lookup_id("template pack_id", &template.pack_id)?;
            if template.pack_id != pack.id {
                return Err(format!(
                    "Template {} declares pack_id {}, expected {}",
                    template.id, template.pack_id, pack.id
                ));
            }
            if !template_ids.insert(template.id.clone()) {
                return Err(format!("Duplicate prompt template id: {}", template.id));
            }
            let mut slot_ids = HashSet::new();
            for slot in &template.slots {
                if slot.id.trim().is_empty() {
                    return Err(format!("Template {} has an empty slot id", template.id));
                }
                validate_lookup_id("slot_id", &slot.id)?;
                if !slot_ids.insert(slot.id.clone()) {
                    return Err(format!(
                        "Template {} has duplicate slot {}",
                        template.id, slot.id
                    ));
                }
            }
        }
    }

    Ok(())
}

fn parse_pack_file(raw: &str, source: &str) -> Result<PackFile, String> {
    serde_json::from_str(raw).map_err(|e| format!("Invalid prompt pack {}: {}", source, e))
}

fn validate_lookup_id(field: &str, value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} cannot be empty", field));
    }
    if trimmed.len() > 128 {
        return Err(format!("{} is too long", field));
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
    {
        return Err(format!("Invalid {} '{}'", field, value));
    }
    Ok(())
}

pub fn find_template(template_id: &str) -> Result<PromptTemplate, String> {
    validate_lookup_id("template_id", template_id)?;
    load_builtin_packs()?
        .into_iter()
        .flat_map(|p| p.templates)
        .find(|t| t.id == template_id)
        .ok_or_else(|| format!("Prompt template '{}' not found", template_id))
}

pub fn list_templates(pack_id: Option<&str>) -> Result<Vec<PromptTemplate>, String> {
    if let Some(id) = pack_id {
        validate_lookup_id("pack_id", id)?;
    }
    let mut templates = load_builtin_packs()?
        .into_iter()
        .filter(|p| pack_id.map(|id| id == p.id).unwrap_or(true))
        .flat_map(|p| p.templates)
        .collect::<Vec<_>>();
    templates.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(templates)
}

pub fn validate_slots(
    template: &PromptTemplate,
    slot_values: &HashMap<String, String>,
) -> SlotValidationResult {
    let mut missing_slots = Vec::new();
    let mut errors = Vec::new();

    for slot in &template.slots {
        let value = slot_values
            .get(&slot.id)
            .or(slot.default.as_ref())
            .map(|s| s.trim())
            .unwrap_or("");
        if slot.required && value.is_empty() {
            missing_slots.push(slot.id.clone());
        }
    }

    for key in slot_values.keys() {
        if !template.slots.iter().any(|s| s.id == *key) {
            errors.push(format!("Unknown slot '{}'", key));
        }
    }

    let valid = missing_slots.is_empty() && errors.is_empty();
    let rendered_prompt = if valid {
        Some(render_prompt(template, slot_values))
    } else {
        None
    };

    SlotValidationResult {
        valid,
        missing_slots,
        errors,
        rendered_prompt,
    }
}

pub fn render_prompt(template: &PromptTemplate, slot_values: &HashMap<String, String>) -> String {
    let mut rendered = template.template.clone();
    for slot in &template.slots {
        let value = slot_values
            .get(&slot.id)
            .cloned()
            .or_else(|| slot.default.clone())
            .unwrap_or_default();
        rendered = rendered.replace(&format!("{{{{{}}}}}", slot.id), &value);
        rendered = rendered.replace(&format!("{{{{ {} }}}}", slot.id), &value);
    }
    rendered
}

pub fn suggestions(query: &str, template_id: Option<&str>) -> Result<Vec<Suggestion>, String> {
    let q = query.trim().to_lowercase();
    let mut results = Vec::new();
    let templates = if let Some(id) = template_id {
        vec![find_template(id)?]
    } else {
        list_templates(None)?
    };

    for template in templates {
        let title_score = score_text(&q, &template.title);
        if title_score > 0.0 {
            results.push(Suggestion {
                id: format!("template:{}", template.id),
                label: template.title.clone(),
                source: "template".to_string(),
                insert_text: template.id.clone(),
                score: title_score,
            });
        }

        for slot in &template.slots {
            for value in &slot.suggestions {
                let score = score_text(&q, value) + score_text(&q, &slot.label) * 0.25;
                if score > 0.0 || q.is_empty() {
                    results.push(Suggestion {
                        id: format!("slot:{}:{}", slot.id, value),
                        label: value.clone(),
                        source: slot.label.clone(),
                        insert_text: value.clone(),
                        score: if q.is_empty() { 0.1 } else { score },
                    });
                }
            }
        }
    }

    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(8);
    Ok(results)
}

fn score_text(query: &str, text: &str) -> f64 {
    if query.is_empty() {
        return 0.0;
    }
    let text = text.to_lowercase();
    if text == query {
        10.0
    } else if text.starts_with(query) {
        7.0
    } else if text.contains(query) {
        4.0
    } else {
        query
            .split_whitespace()
            .filter(|part| part.len() > 1 && text.contains(*part))
            .count() as f64
    }
}

#[derive(Clone)]
pub struct PromptDriveDb {
    pool: SqlitePool,
}

impl PromptDriveDb {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn save_prompt(
        &self,
        title: String,
        template_id: Option<String>,
        pack_id: Option<String>,
        slot_values: Value,
        prompt: String,
    ) -> Result<SavedPrompt, String> {
        let id = format!("saved-{}", uuid::Uuid::new_v4());
        let slot_json = serde_json::to_string(&slot_values)
            .map_err(|e| format!("Failed to serialize slot values: {}", e))?;

        sqlx::query(
            r#"
            INSERT INTO promptdrive_saved_prompts
                (id, title, template_id, pack_id, slot_values, prompt)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&title)
        .bind(&template_id)
        .bind(&pack_id)
        .bind(&slot_json)
        .bind(&prompt)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to save prompt: {}", e))?;

        Ok(SavedPrompt {
            id,
            title,
            template_id,
            pack_id,
            slot_values,
            prompt,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    pub async fn list_saved_prompts(&self) -> Result<Vec<SavedPrompt>, String> {
        let rows: Vec<SavedPromptRow> = sqlx::query_as(
            r#"
            SELECT id, title, template_id, pack_id, slot_values, prompt, created_at, updated_at
            FROM promptdrive_saved_prompts
            ORDER BY updated_at DESC
            LIMIT 50
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to list saved prompts: {}", e))?;

        rows.into_iter().map(row_to_saved_prompt).collect()
    }

    pub async fn macro_start(&self) -> Result<String, String> {
        let id = format!("macro-draft-{}", uuid::Uuid::new_v4());
        sqlx::query("INSERT INTO promptdrive_macro_drafts (id, steps) VALUES (?, '[]')")
            .bind(&id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to start macro recording: {}", e))?;
        Ok(id)
    }

    pub async fn macro_stop(
        &self,
        recording_id: String,
        name: String,
        steps: Vec<MacroStep>,
    ) -> Result<MacroDefinition, String> {
        validate_macro_steps(&steps)?;
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM promptdrive_macro_drafts WHERE id = ?)",
        )
        .bind(&recording_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| format!("Failed to inspect macro draft: {}", e))?;
        if !exists {
            return Err("Macro recording is not active".to_string());
        }

        let id = format!("macro-{}", uuid::Uuid::new_v4());
        let risk_level = macro_risk_level(&steps);
        let steps_json = serde_json::to_string(&steps)
            .map_err(|e| format!("Failed to serialize macro steps: {}", e))?;

        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;
        sqlx::query(
            "INSERT INTO promptdrive_macros (id, name, steps, risk_level) VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&name)
        .bind(&steps_json)
        .bind(&risk_level)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to save macro: {}", e))?;
        sqlx::query("DELETE FROM promptdrive_macro_drafts WHERE id = ?")
            .bind(&recording_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to clear macro draft: {}", e))?;
        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(MacroDefinition {
            id,
            name,
            created_at: chrono::Utc::now().to_rfc3339(),
            steps,
            risk_level,
        })
    }

    pub async fn list_macros(&self) -> Result<Vec<MacroDefinition>, String> {
        let rows: Vec<MacroRow> = sqlx::query_as(
            "SELECT id, name, created_at, steps, risk_level FROM promptdrive_macros ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to list macros: {}", e))?;
        rows.into_iter().map(row_to_macro).collect()
    }

    pub async fn get_macro(&self, id: &str) -> Result<MacroDefinition, String> {
        let row: MacroRow = sqlx::query_as(
            "SELECT id, name, created_at, steps, risk_level FROM promptdrive_macros WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to get macro: {}", e))?
        .ok_or_else(|| format!("Macro '{}' not found", id))?;
        let macro_def = row_to_macro(row)?;
        validate_macro_steps(&macro_def.steps)?;
        Ok(macro_def)
    }

    pub async fn delete_macro(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM promptdrive_macros WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete macro: {}", e))?;
        Ok(())
    }
}

fn row_to_saved_prompt(row: SavedPromptRow) -> Result<SavedPrompt, String> {
    let slot_values = serde_json::from_str(&row.slot_values)
        .map_err(|e| format!("Saved prompt {} has invalid slot values: {}", row.id, e))?;
    Ok(SavedPrompt {
        id: row.id,
        title: row.title,
        template_id: row.template_id,
        pack_id: row.pack_id,
        slot_values,
        prompt: row.prompt,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn row_to_macro(row: MacroRow) -> Result<MacroDefinition, String> {
    let steps = serde_json::from_str(&row.steps)
        .map_err(|e| format!("Macro {} has invalid steps: {}", row.id, e))?;
    Ok(MacroDefinition {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        steps,
        risk_level: row.risk_level,
    })
}

pub fn validate_macro_steps(steps: &[MacroStep]) -> Result<(), String> {
    for step in steps {
        if !is_safe_macro_step(&step.kind) {
            return Err(format!("Unsupported PromptDrive macro step: {}", step.kind));
        }
        if step.requires_confirmation {
            return Err(format!(
                "Macro step '{}' requires confirmation and cannot replay silently",
                step.kind
            ));
        }
    }
    Ok(())
}

fn is_safe_macro_step(kind: &str) -> bool {
    matches!(
        kind,
        "select_template"
            | "update_slot"
            | "execute_prompt"
            | "insert_saved_prompt"
            | "accept_suggestion"
    )
}

fn macro_risk_level(steps: &[MacroStep]) -> String {
    if steps.iter().any(|s| s.kind == "execute_prompt") {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}

pub fn slot_map_from_value(value: &Value) -> Result<HashMap<String, String>, String> {
    let obj = value
        .as_object()
        .ok_or_else(|| "slot_values must be an object".to_string())?;
    let mut out = HashMap::new();
    for (key, value) in obj {
        let text = value
            .as_str()
            .map(|s| s.to_string())
            .unwrap_or_else(|| value.to_string());
        out.insert(key.clone(), text);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_template() -> PromptTemplate {
        PromptTemplate {
            id: "core.test".to_string(),
            pack_id: "core".to_string(),
            title: "Test".to_string(),
            description: "Test template".to_string(),
            category: "Test".to_string(),
            agent_hint: None,
            slots: vec![
                PromptSlot {
                    id: "task".to_string(),
                    label: "Task".to_string(),
                    required: true,
                    kind: "textarea".to_string(),
                    default: None,
                    suggestions: vec!["review code".to_string()],
                },
                PromptSlot {
                    id: "tone".to_string(),
                    label: "Tone".to_string(),
                    required: false,
                    kind: "text".to_string(),
                    default: Some("concise".to_string()),
                    suggestions: vec!["direct".to_string()],
                },
            ],
            template: "Do {{task}} in a {{tone}} tone.".to_string(),
            risk_level: "low".to_string(),
        }
    }

    #[test]
    fn rejects_duplicate_template_ids() {
        let template = test_template();
        let packs = vec![
            PromptPack {
                id: "a".to_string(),
                title: "A".to_string(),
                description: "A".to_string(),
                templates: vec![PromptTemplate {
                    pack_id: "a".to_string(),
                    ..template.clone()
                }],
            },
            PromptPack {
                id: "b".to_string(),
                title: "B".to_string(),
                description: "B".to_string(),
                templates: vec![PromptTemplate {
                    pack_id: "b".to_string(),
                    ..template
                }],
            },
        ];
        assert!(validate_packs(&packs)
            .unwrap_err()
            .contains("Duplicate prompt template id"));
    }

    #[test]
    fn rejects_malformed_pack_json_without_panic() {
        let err = parse_pack_file("{ this is not json", "bad-pack.json").unwrap_err();
        assert!(err.contains("Invalid prompt pack bad-pack.json"));
    }

    #[test]
    fn rejects_path_like_pack_and_template_ids() {
        let template = test_template();
        let packs = vec![PromptPack {
            id: "../secrets".to_string(),
            title: "Bad".to_string(),
            description: "Bad".to_string(),
            templates: vec![PromptTemplate {
                pack_id: "../secrets".to_string(),
                ..template
            }],
        }];

        assert!(validate_packs(&packs)
            .unwrap_err()
            .contains("Invalid pack_id"));
        assert!(list_templates(Some("../assets/prompt-packs"))
            .unwrap_err()
            .contains("Invalid pack_id"));
        assert!(find_template("..\\secret")
            .unwrap_err()
            .contains("Invalid template_id"));
        assert!(suggestions("", Some("../../core.jpe_explain"))
            .unwrap_err()
            .contains("Invalid template_id"));
    }

    #[test]
    fn validates_missing_required_slots() {
        let result = validate_slots(&test_template(), &HashMap::new());
        assert!(!result.valid);
        assert_eq!(result.missing_slots, vec!["task"]);
    }

    #[test]
    fn rejects_non_object_slot_payloads() {
        let err = slot_map_from_value(&serde_json::json!(["task", "review"])).unwrap_err();
        assert_eq!(err, "slot_values must be an object");
    }

    #[test]
    fn renders_prompt_with_defaults() {
        let mut values = HashMap::new();
        values.insert("task".to_string(), "review code".to_string());
        let result = validate_slots(&test_template(), &values);
        assert!(result.valid);
        assert_eq!(
            result.rendered_prompt.unwrap(),
            "Do review code in a concise tone."
        );
    }

    #[test]
    fn ranks_suggestions_by_match_quality() {
        assert!(score_text("rev", "review code") > score_text("rev", "direct"));
    }

    #[test]
    fn rejects_unsafe_macro_steps() {
        let steps = vec![MacroStep {
            kind: "shell_command".to_string(),
            timestamp: "2026-01-01T00:00:00Z".to_string(),
            payload: Value::Null,
            requires_confirmation: true,
        }];
        assert!(validate_macro_steps(&steps).is_err());
    }

    #[test]
    fn rejects_confirmation_gated_macro_steps() {
        let steps = vec![MacroStep {
            kind: "execute_prompt".to_string(),
            timestamp: "2026-01-01T00:00:00Z".to_string(),
            payload: serde_json::json!({"template_id":"core.test"}),
            requires_confirmation: true,
        }];
        let err = validate_macro_steps(&steps).unwrap_err();
        assert!(err.contains("requires confirmation"));
    }

    #[test]
    fn preserves_macro_replay_order() {
        let steps = vec![
            MacroStep {
                kind: "select_template".to_string(),
                timestamp: "1".to_string(),
                payload: serde_json::json!({"template_id":"core.test"}),
                requires_confirmation: false,
            },
            MacroStep {
                kind: "update_slot".to_string(),
                timestamp: "2".to_string(),
                payload: serde_json::json!({"slot_id":"task","value":"review code"}),
                requires_confirmation: false,
            },
        ];
        validate_macro_steps(&steps).unwrap();
        assert_eq!(steps[0].kind, "select_template");
        assert_eq!(steps[1].kind, "update_slot");
    }

    #[tokio::test]
    async fn persists_safe_macro_steps_for_replay_in_order() {
        let pool = sqlx::SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(include_str!("db/migrations/004_promptdrive.sql"))
            .execute(&pool)
            .await
            .unwrap();
        let db = PromptDriveDb::new(pool);
        let recording_id = db.macro_start().await.unwrap();
        let steps = vec![
            MacroStep {
                kind: "select_template".to_string(),
                timestamp: "1".to_string(),
                payload: serde_json::json!({"template_id":"core.test"}),
                requires_confirmation: false,
            },
            MacroStep {
                kind: "execute_prompt".to_string(),
                timestamp: "2".to_string(),
                payload: serde_json::json!({"template_id":"core.test","slot_values":{"task":"review"}}),
                requires_confirmation: false,
            },
            MacroStep {
                kind: "insert_saved_prompt".to_string(),
                timestamp: "3".to_string(),
                payload: serde_json::json!({"saved_prompt_id":"saved-1"}),
                requires_confirmation: false,
            },
        ];

        let saved = db
            .macro_stop(recording_id, "Replay Smoke".to_string(), steps)
            .await
            .unwrap();
        assert_eq!(saved.risk_level, "medium");

        let replay = db.get_macro(&saved.id).await.unwrap();
        let kinds = replay
            .steps
            .iter()
            .map(|step| step.kind.as_str())
            .collect::<Vec<_>>();
        assert_eq!(
            kinds,
            vec!["select_template", "execute_prompt", "insert_saved_prompt"]
        );
    }
}

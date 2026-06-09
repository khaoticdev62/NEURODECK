//! # Workflow Execution Engine
//!
//! Headless execution of NEURODECK workflows. Parses frontend workflow JSON,
//! traverses the node graph, and executes each node with state passing.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::bridge::EventEmitter;

// ──────────────────────────────────────────────────────────────────────────
// Data Structures
// ──────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WorkflowEdge {
    pub id: String,
    pub from: String,
    #[serde(rename = "fromPort")]
    pub from_port: String,
    pub to: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WorkflowDoc {
    pub name: String,
    #[serde(default)]
    pub nodes: Vec<WorkflowNode>,
    #[serde(default)]
    pub edges: Vec<WorkflowEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRunState {
    pub workflow_name: String,
    pub current_node_id: Option<String>,
    pub outputs: HashMap<String, String>,
    pub running: bool,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub final_output: Option<String>,
    pub error: Option<String>,
}

impl WorkflowRunState {
    pub fn new(name: &str) -> Self {
        Self {
            workflow_name: name.to_string(),
            current_node_id: None,
            outputs: HashMap::new(),
            running: true,
            started_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
            final_output: None,
            error: None,
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Parsing
// ──────────────────────────────────────────────────────────────────────────

pub fn parse_workflow(json: &str) -> Result<WorkflowDoc, String> {
    serde_json::from_str(json).map_err(|e| format!("Invalid workflow JSON: {}", e))
}

// ──────────────────────────────────────────────────────────────────────────
// Template Substitution
// ──────────────────────────────────────────────────────────────────────────

/// Substitute `{{input}}` and `{{node:ID}}` placeholders in a string.
pub fn substitute_template(
    template: &str,
    input: &str,
    outputs: &HashMap<String, String>,
) -> String {
    let mut result = template.replace("{{input}}", input);
    // Replace {{node:n1}} with the output of node n1
    let mut start = 0;
    while let Some(pos) = result[start..].find("{{node:") {
        let abs_pos = start + pos;
        if let Some(end) = result[abs_pos..].find("}}") {
            let end_abs = abs_pos + end;
            let inner = &result[abs_pos + 7..end_abs]; // after "{{node:"
            let replacement = outputs.get(inner).map(|s| s.as_str()).unwrap_or("");
            result.replace_range(abs_pos..=end_abs + 1, replacement);
            start = abs_pos + replacement.len();
        } else {
            break;
        }
    }
    result
}

/// Recursively substitute templates in any JSON value.
pub fn substitute_in_value(
    value: &mut serde_json::Value,
    input: &str,
    outputs: &HashMap<String, String>,
) {
    match value {
        serde_json::Value::String(s) => {
            *s = substitute_template(s, input, outputs);
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                substitute_in_value(item, input, outputs);
            }
        }
        serde_json::Value::Object(obj) => {
            for (_, v) in obj.iter_mut() {
                substitute_in_value(v, input, outputs);
            }
        }
        _ => {}
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Condition Evaluator
// ──────────────────────────────────────────────────────────────────────────

/// Evaluate a simple condition expression on a string input.
/// Supports: ==, !=, <, >, <=, >=, .len(), .contains(), &&, ||
pub fn eval_condition(expr: &str, input: &str) -> Result<bool, String> {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return Ok(false);
    }

    // Pre-resolve all method calls so operator scanning sees plain values.
    // "input.len()" → "<N>", "input.contains(X)" → "true"/"false", "input" → actual value.
    let resolved = preprocess_expr(trimmed, input);
    let trimmed = resolved.trim();

    // Handle && and || (split carefully, no regex)
    if let Some(pos) = find_top_level_op(trimmed, "&&") {
        // left/right are byte-safe because preprocess_expr produces ASCII-only values
        let left = &trimmed[..pos];
        let right = &trimmed[pos + 2..];
        return Ok(eval_condition(left, input)? && eval_condition(right, input)?);
    }
    if let Some(pos) = find_top_level_op(trimmed, "||") {
        let left = &trimmed[..pos];
        let right = &trimmed[pos + 2..];
        return Ok(eval_condition(left, input)? || eval_condition(right, input)?);
    }

    // Handle comparison operators (longest-match first to avoid ">=" matching as ">")
    for (op, op_len) in [
        ("==", 2usize),
        ("!=", 2),
        ("<=", 2),
        (">=", 2),
        ("<", 1),
        (">", 1),
    ] {
        if let Some(pos) = find_top_level_op(trimmed, op) {
            let left = trimmed[..pos].trim();
            let right = trimmed[pos + op_len..].trim();
            let left_val = eval_operand(left, input)?;
            let right_val = eval_operand(right, input)?;
            // Numeric comparison if both sides parse as f64
            if let (Ok(ln), Ok(rn)) = (left_val.parse::<f64>(), right_val.parse::<f64>()) {
                return match op {
                    "==" => Ok((ln - rn).abs() < f64::EPSILON),
                    "!=" => Ok((ln - rn).abs() >= f64::EPSILON),
                    "<" => Ok(ln < rn),
                    ">" => Ok(ln > rn),
                    "<=" => Ok(ln <= rn),
                    ">=" => Ok(ln >= rn),
                    _ => unreachable!(),
                };
            }
            // String comparison fallback
            return match op {
                "==" => Ok(left_val == right_val),
                "!=" => Ok(left_val != right_val),
                "<" => Ok(left_val < right_val),
                ">" => Ok(left_val > right_val),
                "<=" => Ok(left_val <= right_val),
                ">=" => Ok(left_val >= right_val),
                _ => unreachable!(),
            };
        }
    }

    // Bare boolean: treat as truthy check
    let val = eval_operand(trimmed, input)?;
    Ok(!val.is_empty() && val != "false" && val != "0")
}

/// Replace `input.len()`, `input.contains(X)`, and bare `input` tokens in an expression
/// with their evaluated values. This runs before operator scanning so that method-call
/// syntax never ends up on the wrong side of a split.
fn preprocess_expr(expr: &str, input: &str) -> String {
    let mut s = expr.to_string();

    // Replace input.contains("x") / input.contains('x') calls
    while let Some(start) = s.find("input.contains(") {
        let after = start + "input.contains(".len();
        if let Some(end) = s[after..].find(')') {
            let arg = s[after..after + end]
                .trim()
                .trim_matches('"')
                .trim_matches('\'');
            let result = input.contains(arg).to_string();
            s.replace_range(start..after + end + 1, &result);
        } else {
            break;
        }
    }

    // Replace input.len() calls
    s = s.replace("input.len()", &input.len().to_string());

    // Replace bare `input` token (whole-word, not inside identifiers)
    // Walk character-by-character to avoid replacing "input" inside other words.
    let mut out = String::with_capacity(s.len());
    let mut i = 0;
    let bytes = s.as_bytes();
    while i < bytes.len() {
        if s[i..].starts_with("input") {
            let end = i + 5;
            let before_ok = i == 0 || !bytes[i - 1].is_ascii_alphanumeric() && bytes[i - 1] != b'_';
            let after_ok = end >= bytes.len()
                || !bytes[end].is_ascii_alphanumeric() && bytes[end] != b'_' && bytes[end] != b'.';
            if before_ok && after_ok {
                out.push('"');
                out.push_str(input);
                out.push('"');
                i = end;
                continue;
            }
        }
        out.push(s.as_bytes()[i] as char);
        i += 1;
    }
    out
}

/// Find an operator at the top level (not inside parentheses or quotes).
fn find_top_level_op(s: &str, op: &str) -> Option<usize> {
    let mut depth = 0;
    let mut in_quote = false;
    let chars: Vec<char> = s.chars().collect();
    let op_chars: Vec<char> = op.chars().collect();

    let mut i = 0;
    while i + op_chars.len() <= chars.len() {
        let c = chars[i];
        if c == '"' || c == '\'' {
            in_quote = !in_quote;
        } else if !in_quote {
            if c == '(' {
                depth += 1;
            } else if c == ')' {
                depth -= 1;
            } else if depth == 0 {
                let matches = op_chars
                    .iter()
                    .enumerate()
                    .all(|(j, &oc)| chars[i + j] == oc);
                if matches {
                    return Some(i);
                }
            }
        }
        i += 1;
    }
    None
}

/// Evaluate a single operand, resolving `input`, `input.len()`, `input.contains("x")`, and string literals.
fn eval_operand(expr: &str, input: &str) -> Result<String, String> {
    let trimmed = expr.trim();
    if trimmed == "input" {
        return Ok(input.to_string());
    }
    if trimmed == "input.len()" {
        return Ok(input.len().to_string());
    }
    if let Some(inner) = trimmed.strip_prefix("input.contains(") {
        if let Some(arg) = inner.strip_suffix(")") {
            let needle = arg.trim().trim_matches('"').trim_matches('\'');
            return Ok(input.contains(needle).to_string());
        }
    }
    // String literal or raw value
    Ok(trimmed.trim_matches('"').trim_matches('\'').to_string())
}

// ──────────────────────────────────────────────────────────────────────────
// Transform Engine
// ──────────────────────────────────────────────────────────────────────────

fn apply_transform(mode: &str, input: &str, _template: &str) -> String {
    match mode {
        "trim" => input.trim().to_string(),
        "uppercase" => input.to_uppercase(),
        "lowercase" => input.to_lowercase(),
        "title_case" => input
            .split_whitespace()
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => {
                        c.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" "),
        "reverse" => input.chars().rev().collect(),
        "count_words" => input.split_whitespace().count().to_string(),
        "template" => _template.replace("{{input}}", input),
        _ => input.to_string(),
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Node Execution
// ──────────────────────────────────────────────────────────────────────────

async fn exec_node<E: EventEmitter>(
    node: &WorkflowNode,
    input: &str,
    outputs: &HashMap<String, String>,
    app_state: &Arc<Mutex<crate::AppState>>,
    broadcaster: &E,
) -> Result<String, String> {
    broadcaster.emit(
        "workflow_node_start",
        serde_json::json!({ "node_id": node.id, "node_type": node.node_type }),
    );

    let mut config = node.config.clone();
    substitute_in_value(&mut config, input, outputs);

    let result = match node.node_type.as_str() {
        "trigger" => {
            let seed = config.get("seed").and_then(|v| v.as_str()).unwrap_or("");
            Ok(seed.to_string())
        }
        "prompt" => {
            let prompt = config.get("prompt").and_then(|v| v.as_str()).unwrap_or("");
            if prompt.is_empty() {
                return Err("Prompt node has empty prompt".to_string());
            }
            let provider = {
                let app = app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.provider.clone()
            };
            provider
                .generate_oneshot(prompt, 800)
                .await
                .map_err(|e| format!("LLM error: {}", e))
        }
        "shell" => {
            let code = config
                .get("command")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let lang = config
                .get("lang")
                .and_then(|v| v.as_str())
                .unwrap_or("bash")
                .to_string();
            if code.is_empty() {
                return Err("Shell node has empty command".to_string());
            }
            // Build owned command data for the 'static closure
            let (program, args): (String, Vec<String>) = match lang.to_lowercase().as_str() {
                "python" | "python3" => {
                    if cfg!(target_os = "windows") {
                        ("python".into(), vec!["-c".into(), code])
                    } else {
                        ("python3".into(), vec!["-c".into(), code])
                    }
                }
                "bash" | "sh" | "shell" => {
                    if cfg!(target_os = "windows") {
                        ("powershell".into(), vec!["-Command".into(), code])
                    } else {
                        ("bash".into(), vec!["-c".into(), code])
                    }
                }
                "powershell" => ("powershell".into(), vec!["-Command".into(), code]),
                _ => return Err(format!("Unsupported shell language: {}", lang)),
            };
            let output = tokio::time::timeout(
                std::time::Duration::from_secs(30),
                tokio::task::spawn_blocking(move || {
                    let mut cmd = std::process::Command::new(&program);
                    cmd.args(&args);
                    match cmd.output() {
                        Ok(out) => {
                            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                            if !stderr.is_empty() && stdout.is_empty() {
                                Ok(stderr)
                            } else {
                                Ok(stdout)
                            }
                        }
                        Err(e) => Err(format!("Failed to spawn: {}", e)),
                    }
                }),
            )
            .await
            .map_err(|_| "Shell execution timed out (30s)".to_string())?
            .map_err(|e| format!("Task panicked: {}", e))?;
            output
        }
        "file_op" => {
            let mode = config
                .get("mode")
                .and_then(|v| v.as_str())
                .unwrap_or("read");
            let path = config.get("path").and_then(|v| v.as_str()).unwrap_or("");
            if path.is_empty() {
                return Err("File Op node has empty path".to_string());
            }
            match mode {
                "read" => tokio::fs::read_to_string(path)
                    .await
                    .map_err(|e| format!("Read failed: {}", e)),
                "write" => {
                    let content = config.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    tokio::fs::write(path, content)
                        .await
                        .map_err(|e| format!("Write failed: {}", e))?;
                    Ok(format!("Written {} bytes", content.len()))
                }
                "append" => {
                    let content = config.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    let existing = tokio::fs::read_to_string(path).await.unwrap_or_default();
                    let combined = format!("{}{}", existing, content);
                    tokio::fs::write(path, combined)
                        .await
                        .map_err(|e| format!("Append failed: {}", e))?;
                    Ok(format!("Appended {} bytes", content.len()))
                }
                _ => Err(format!("Unknown file_op mode: {}", mode)),
            }
        }
        "pty_cmd" => {
            // PTY command nodes require the PTY system which is not wired in bridge mode.
            // Return a descriptive placeholder.
            let cmd = config.get("command").and_then(|v| v.as_str()).unwrap_or("");
            Ok(format!("[PTY not available in headless mode] {}", cmd))
        }
        "memory" => {
            let query = config
                .get("query")
                .and_then(|v| v.as_str())
                .unwrap_or(input);
            let limit = config.get("limit").and_then(|v| v.as_u64()).unwrap_or(3) as usize;
            let app = app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app.mem_db {
                match db.list_all() {
                    Ok(records) => {
                        let query_lower = query.to_lowercase();
                        let mut scored: Vec<(usize, _)> = records
                            .into_iter()
                            .filter_map(|rec| {
                                let lower = rec.content.to_lowercase();
                                let hits = query_lower
                                    .split_whitespace()
                                    .filter(|w| w.len() > 2)
                                    .filter(|w| lower.contains(&w.to_lowercase()[..]))
                                    .count();
                                if hits > 0 {
                                    Some((hits, rec))
                                } else {
                                    None
                                }
                            })
                            .collect();
                        scored.sort_by(|a, b| b.0.cmp(&a.0));
                        let results: Vec<String> = scored
                            .into_iter()
                            .take(limit)
                            .map(|(_, rec)| rec.content)
                            .collect();
                        Ok(results.join("\n---\n"))
                    }
                    Err(e) => Err(format!("Memory search failed: {}", e)),
                }
            } else {
                Ok("Memory database not initialized".to_string())
            }
        }
        "condition" => {
            let expr = config
                .get("expression")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let true_seed = config
                .get("trueSeed")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let false_seed = config
                .get("falseSeed")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let is_true = eval_condition(expr, input).unwrap_or(false);
            // Return the seed for the branch that will be taken.
            // The router in execute_workflow handles edge selection.
            Ok(if is_true { true_seed } else { false_seed }.to_string())
        }
        "transform" => {
            let mode = config
                .get("mode")
                .and_then(|v| v.as_str())
                .unwrap_or("trim");
            let template = config
                .get("template")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(apply_transform(mode, input, template))
        }
        "output" => {
            // Output node is a no-op — the input is the final result.
            Ok(input.to_string())
        }
        _ => Err(format!("Unknown node type: {}", node.node_type)),
    };

    broadcaster.emit(
        "workflow_node_done",
        serde_json::json!({
            "node_id": node.id,
            "node_type": node.node_type,
            "success": result.is_ok(),
            "output": result.as_ref().ok(),
            "error": result.as_ref().err(),
        }),
    );

    result
}

// ──────────────────────────────────────────────────────────────────────────
// Graph Traversal
// ──────────────────────────────────────────────────────────────────────────

/// Find the single trigger node in a workflow.
fn find_trigger_node(nodes: &[WorkflowNode]) -> Option<&WorkflowNode> {
    nodes.iter().find(|n| n.node_type == "trigger")
}

/// Find outgoing edges from a node, optionally filtered by port.
fn find_outgoing_edges<'a>(
    edges: &'a [WorkflowEdge],
    from: &str,
    port: Option<&str>,
) -> Vec<&'a WorkflowEdge> {
    edges
        .iter()
        .filter(|e| e.from == from && (port.is_none() || e.from_port == port.unwrap()))
        .collect()
}

/// Find the node with the given ID.
fn find_node_by_id<'a>(nodes: &'a [WorkflowNode], id: &str) -> Option<&'a WorkflowNode> {
    nodes.iter().find(|n| n.id == id)
}

// ──────────────────────────────────────────────────────────────────────────
// Main Execution
// ──────────────────────────────────────────────────────────────────────────

pub async fn execute_workflow<E: EventEmitter>(
    name: &str,
    doc: &WorkflowDoc,
    app_state: Arc<Mutex<crate::AppState>>,
    broadcaster: E,
) -> WorkflowRunState {
    let mut state = WorkflowRunState::new(name);

    let trigger = match find_trigger_node(&doc.nodes) {
        Some(t) => t,
        None => {
            state.error = Some("No trigger node found".to_string());
            state.running = false;
            state.completed_at = Some(chrono::Utc::now().to_rfc3339());
            return state;
        }
    };

    // Execute trigger
    let trigger_output =
        match exec_node(trigger, "", &state.outputs, &app_state, &broadcaster).await {
            Ok(out) => out,
            Err(e) => {
                state.error = Some(format!("Trigger failed: {}", e));
                state.running = false;
                state.completed_at = Some(chrono::Utc::now().to_rfc3339());
                return state;
            }
        };
    state
        .outputs
        .insert(trigger.id.clone(), trigger_output.clone());

    // BFS/DFS traversal starting from trigger's outgoing edges
    let mut queue: Vec<(String, String)> = Vec::new(); // (node_id, input)
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();

    // Seed the queue with trigger's children
    for edge in find_outgoing_edges(&doc.edges, &trigger.id, None) {
        queue.push((edge.to.clone(), trigger_output.clone()));
    }

    while let Some((node_id, input)) = queue.pop() {
        if visited.contains(&node_id) {
            continue;
        }
        visited.insert(node_id.clone());

        let node = match find_node_by_id(&doc.nodes, &node_id) {
            Some(n) => n,
            None => continue,
        };

        state.current_node_id = Some(node_id.clone());

        let output = match exec_node(node, &input, &state.outputs, &app_state, &broadcaster).await {
            Ok(out) => out,
            Err(e) => {
                state.error = Some(format!("Node '{}' failed: {}", node_id, e));
                broadcaster.emit(
                    "workflow_error",
                    serde_json::json!({
                        "node_id": node_id,
                        "error": e
                    }),
                );
                break;
            }
        };

        state.outputs.insert(node_id.clone(), output.clone());

        // If this is an output node, we're done with this branch
        if node.node_type == "output" {
            state.final_output = Some(output.clone());
            continue;
        }

        // For condition nodes, route based on expression result
        if node.node_type == "condition" {
            let expr = node
                .config
                .get("expression")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let is_true = eval_condition(expr, &input).unwrap_or(false);
            let port = if is_true { "out-true" } else { "out-false" };
            for edge in find_outgoing_edges(&doc.edges, &node_id, Some(port)) {
                queue.push((edge.to.clone(), output.clone()));
            }
            // Also push to the other branch with empty input if it exists? No — only follow matched branch.
        } else {
            // Normal node — push to all outgoing edges
            for edge in find_outgoing_edges(&doc.edges, &node_id, Some("out")) {
                queue.push((edge.to.clone(), output.clone()));
            }
        }
    }

    state.running = false;
    state.completed_at = Some(chrono::Utc::now().to_rfc3339());
    broadcaster.emit(
        "workflow_complete",
        serde_json::json!({
            "workflow_name": name,
            "success": state.error.is_none(),
            "outputs": state.outputs,
            "final_output": state.final_output,
        }),
    );
    state
}

// ──────────────────────────────────────────────────────────────────────────
// Run History Persistence
// ──────────────────────────────────────────────────────────────────────────

pub fn history_dir(name: &str) -> std::path::PathBuf {
    crate::user_config_dir()
        .join("data/workflows/history")
        .join(name)
}

pub fn save_run_history(name: &str, state: &WorkflowRunState) -> Result<(), String> {
    let dir = history_dir(name);
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create history dir: {}", e))?;
    let filename = format!("{}.json", state.started_at.replace(':', "-"));
    let path = dir.join(filename);
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write history: {}", e))?;
    Ok(())
}

pub fn list_run_history(name: &str) -> Result<Vec<WorkflowRunState>, String> {
    let dir = history_dir(name);
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut runs = Vec::new();
    for entry in std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
    {
        if entry.path().extension().is_some_and(|e| e == "json") {
            if let Ok(content) = std::fs::read_to_string(entry.path()) {
                if let Ok(run) = serde_json::from_str::<WorkflowRunState>(&content) {
                    runs.push(run);
                }
            }
        }
    }
    runs.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(runs)
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_workflow() {
        let json = r#"{"name":"Test","nodes":[{"id":"n1","type":"trigger","config":{"seed":"hello"}},{"id":"n2","type":"output","config":{}}],"edges":[{"id":"e1","from":"n1","fromPort":"out","to":"n2"}]}"#;
        let doc = parse_workflow(json).unwrap();
        assert_eq!(doc.name, "Test");
        assert_eq!(doc.nodes.len(), 2);
        assert_eq!(doc.edges.len(), 1);
    }

    #[test]
    fn test_substitute_input() {
        let mut outputs = HashMap::new();
        outputs.insert("n1".to_string(), "world".to_string());
        assert_eq!(
            substitute_template("Hello {{input}}!", "world", &outputs),
            "Hello world!"
        );
        assert_eq!(
            substitute_template("Ref: {{node:n1}}", "x", &outputs),
            "Ref: world"
        );
    }

    #[test]
    fn test_condition_evaluator_eq() {
        assert!(eval_condition("input == \"hello\"", "hello").unwrap());
        assert!(!eval_condition("input == \"hello\"", "world").unwrap());
    }

    #[test]
    fn test_condition_evaluator_len() {
        assert!(eval_condition("input.len() > 3", "hello").unwrap());
        assert!(!eval_condition("input.len() > 10", "hello").unwrap());
    }

    #[test]
    fn test_condition_evaluator_contains() {
        assert!(eval_condition("input.contains(\"ell\")", "hello").unwrap());
        assert!(!eval_condition("input.contains(\"xyz\")", "hello").unwrap());
    }

    #[test]
    fn test_condition_evaluator_and_or() {
        assert!(eval_condition("input.len() > 2 && input.contains(\"h\")", "hello").unwrap());
        assert!(!eval_condition("input.len() > 10 || input == \"nope\"", "hello").unwrap());
    }

    #[test]
    fn test_transform_trim() {
        assert_eq!(apply_transform("trim", "  hello  ", ""), "hello");
    }

    #[test]
    fn test_transform_uppercase() {
        assert_eq!(apply_transform("uppercase", "hello", ""), "HELLO");
    }

    #[test]
    fn test_transform_count_words() {
        assert_eq!(apply_transform("count_words", "one two three", ""), "3");
    }

    #[test]
    fn test_eval_operand_input() {
        assert_eq!(eval_operand("input", "test").unwrap(), "test");
        assert_eq!(eval_operand("input.len()", "test").unwrap(), "4");
    }
}

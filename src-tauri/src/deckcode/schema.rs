use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ControllerProfileSchema {
    pub title: String,
    pub version: String,
    pub device: String,
    pub profile_name: String,
    pub description: String,
    pub design_rules: Vec<String>,
    pub source_inventory: SourceInventory,
    pub action_sets: HashMap<String, ActionSet>,
    pub predictive_engine: PredictiveEngine,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SourceInventory {
    pub face_buttons: Vec<String>,
    pub dpad: Vec<String>,
    pub shoulders: Vec<String>,
    pub triggers: Vec<String>,
    pub sticks: Vec<String>,
    pub trackpads: Vec<String>,
    pub rear_grips: Vec<String>,
    pub meta_buttons: Vec<String>,
    pub motion: Vec<String>,
    pub auxiliary: Vec<String>,
    pub system_reserved: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ActionSet {
    pub purpose: String,
    pub mode: Option<String>,
    pub activation: Option<String>,
    #[serde(default)]
    pub bindings: Vec<Binding>,
    pub click: Option<Binding>,
    pub hold: Option<Binding>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Binding {
    pub source: Option<String>,
    pub event: Option<String>,
    pub guard: Option<String>,
    pub emit: String,
    pub mode: Option<String>,
    pub slot: Option<i32>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PredictiveEngine {
    pub name: String,
    pub inputs: Vec<String>,
    pub ranking_formula: String,
    pub safety_classes: HashMap<String, Vec<String>>,
    pub rules: Vec<PredictiveRule>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PredictiveRule {
    pub when: String,
    pub predict: Vec<String>,
    pub bind_hint: String,
}

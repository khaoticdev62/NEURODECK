use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct ResolverContext {
    pub active_set: String,
    pub active_layers: HashSet<String>,
    pub focused_app: String,
}

impl Default for ResolverContext {
    fn default() -> Self {
        Self {
            active_set: "global".to_string(),
            active_layers: HashSet::new(),
            focused_app: "".to_string(),
        }
    }
}

use std::collections::HashSet;
use crate::deckcode::schema::{ControllerProfileSchema, Binding};
use crate::deckcode::input::InputEvent;

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

pub struct DeckCodeResolver {
    pub schema: ControllerProfileSchema,
}

impl DeckCodeResolver {
    pub fn new(schema: ControllerProfileSchema) -> Self {
        Self { schema }
    }

    pub fn resolve(&self, event: &InputEvent, context: &ResolverContext) -> Option<Binding> {
        // System reserved check
        if self.schema.source_inventory.system_reserved.contains(&event.source) {
            return None;
        }

        let mut candidates = Vec::new();

        // Find bindings matching the source and event type
        for (set_name, action_set) in &self.schema.action_sets {
            // Check bindings array
            for binding in &action_set.bindings {
                if let Some(src) = &binding.source {
                    if self.matches_source_and_event(src, event) {
                        candidates.push((set_name.clone(), binding.clone()));
                    }
                }
            }
            
            // Check explicit click/hold
            if let Some(click) = &action_set.click {
                if let Some(src) = &click.source {
                    if self.matches_source_and_event(src, event) {
                        candidates.push((set_name.clone(), click.clone()));
                    }
                }
            }
            if let Some(hold) = &action_set.hold {
                if let Some(src) = &hold.source {
                    if self.matches_source_and_event(src, event) {
                        candidates.push((set_name.clone(), hold.clone()));
                    }
                }
            }
        }

        if candidates.is_empty() {
            return None;
        }

        // Filtering & Sorting
        let mut valid_candidates: Vec<_> = candidates.into_iter()
            .filter(|(set_name, _binding)| {
                // Keep if it's the global set, the active set, or an active layer
                set_name == "global" || 
                set_name == &context.active_set || 
                context.active_layers.contains(set_name)
            })
            .collect();

        if valid_candidates.is_empty() {
            return None;
        }

        valid_candidates.sort_by(|a, b| {
            // Sort by priority: Active Set > Active Layer > Global
            let rank_a = self.get_set_priority(&a.0, context);
            let rank_b = self.get_set_priority(&b.0, context);
            rank_b.cmp(&rank_a)
        });

        Some(valid_candidates.first().unwrap().1.clone())
    }

    fn matches_source_and_event(&self, mapping_source: &str, event: &InputEvent) -> bool {
        // e.g. "l4+a" vs "a"
        // Since InputEvent doesn't contain chords yet, we just match base source + event string
        let mapping_parts: Vec<&str> = mapping_source.split('+').collect();
        let primary_source = mapping_parts.last().unwrap_or(&"");

        // Strip modifier from source string (e.g. l4+a -> a)
        if *primary_source != event.source {
            return false;
        }

        // We would also check event.event_type against binding.event here
        true
    }

    fn get_set_priority(&self, set_name: &str, context: &ResolverContext) -> i32 {
        if set_name == &context.active_set {
            return 3;
        }
        if context.active_layers.contains(set_name) {
            return 2;
        }
        if set_name == "global" {
            return 1;
        }
        0
    }
}

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum PrivacyLevel {
    #[serde(rename = "standard")]
    Standard,
    #[serde(rename = "private")]
    Private,
    #[serde(rename = "sensitive")]
    Sensitive,
    #[serde(rename = "sealed")]
    Sealed,
}

impl PrivacyLevel {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "private" => PrivacyLevel::Private,
            "sensitive" => PrivacyLevel::Sensitive,
            "sealed" => PrivacyLevel::Sealed,
            _ => PrivacyLevel::Standard,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            PrivacyLevel::Standard => "standard",
            PrivacyLevel::Private => "private",
            PrivacyLevel::Sensitive => "sensitive",
            PrivacyLevel::Sealed => "sealed",
        }
    }
}

/// Tracks which sealed records are currently unlocked in this session.
#[derive(Clone, Default)]
pub struct UnlockState {
    unlocked_ids: HashSet<String>,
}

impl UnlockState {
    pub fn unlock(&mut self, id: &str) {
        self.unlocked_ids.insert(id.to_string());
    }

    pub fn lock(&mut self, id: &str) {
        self.unlocked_ids.remove(id);
    }

    pub fn lock_all(&mut self) {
        self.unlocked_ids.clear();
    }

    pub fn is_unlocked(&self, id: &str) -> bool {
        self.unlocked_ids.contains(id)
    }
}

pub struct PrivacyFilter;

impl PrivacyFilter {
    /// Can this record appear in universal search results?
    pub fn can_search(level: &PrivacyLevel, is_unlocked: bool) -> bool {
        match level {
            PrivacyLevel::Standard => true,
            PrivacyLevel::Private => true,
            PrivacyLevel::Sensitive => true,
            PrivacyLevel::Sealed => is_unlocked,
        }
    }

    /// How much of the content can be shown in search snippets?
    /// Returns `Some(max_chars)` or `None` if no snippet allowed.
    pub fn snippet_limit(level: &PrivacyLevel, _is_unlocked: bool) -> Option<usize> {
        match level {
            PrivacyLevel::Standard => None, // no limit
            PrivacyLevel::Private => Some(80),
            PrivacyLevel::Sensitive => None,
            PrivacyLevel::Sealed => None,
        }
    }

    /// Can this record be injected into LLM context (RAG)?
    pub fn can_inject(level: &PrivacyLevel, is_unlocked: bool) -> bool {
        match level {
            PrivacyLevel::Standard => true,
            PrivacyLevel::Private => true,
            PrivacyLevel::Sensitive => true,
            PrivacyLevel::Sealed => is_unlocked,
        }
    }

    /// Does this record require user confirmation before injection?
    pub fn requires_confirmation(level: &PrivacyLevel) -> bool {
        matches!(level, PrivacyLevel::Sensitive)
    }

    /// Can this record be exported?
    pub fn can_export(level: &PrivacyLevel, is_unlocked: bool) -> bool {
        match level {
            PrivacyLevel::Standard => true,
            PrivacyLevel::Private => true,
            PrivacyLevel::Sensitive => true,
            PrivacyLevel::Sealed => is_unlocked,
        }
    }

    /// Should the export show a warning for this level?
    pub fn export_warning(level: &PrivacyLevel) -> Option<&'static str> {
        match level {
            PrivacyLevel::Standard => None,
            PrivacyLevel::Private => Some("This export contains private records."),
            PrivacyLevel::Sensitive => {
                Some("This export contains sensitive records. Share with caution.")
            }
            PrivacyLevel::Sealed => None,
        }
    }

    /// Can plugins access this record?
    pub fn can_plugin_access(level: &PrivacyLevel) -> bool {
        matches!(level, PrivacyLevel::Standard)
    }
}

/// Filter a list of memory records for a given operation.
/// Returns `(approved, needs_confirmation)` where `needs_confirmation` contains
/// sensitive records that require explicit user approval.
pub fn filter_for_injection<T: HasPrivacy>(
    records: Vec<T>,
    unlock_state: &UnlockState,
) -> (Vec<T>, Vec<T>) {
    let mut approved = Vec::new();
    let mut needs_confirmation = Vec::new();

    for rec in records {
        let level = rec.privacy_level();
        let is_unlocked = unlock_state.is_unlocked(&rec.id());

        if !PrivacyFilter::can_inject(&level, is_unlocked) {
            continue;
        }

        if PrivacyFilter::requires_confirmation(&level) {
            needs_confirmation.push(rec);
        } else {
            approved.push(rec);
        }
    }

    (approved, needs_confirmation)
}

/// Trait for types that have a privacy level and ID.
pub trait HasPrivacy {
    fn privacy_level(&self) -> PrivacyLevel;
    fn id(&self) -> String;
}

impl HasPrivacy for crate::memory::MemoryRecord {
    fn privacy_level(&self) -> PrivacyLevel {
        self.metadata
            .get("privacy_level")
            .map(|s| PrivacyLevel::from_str(s))
            .unwrap_or(PrivacyLevel::Standard)
    }

    fn id(&self) -> String {
        self.id.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_privacy_levels() {
        assert!(PrivacyFilter::can_search(&PrivacyLevel::Standard, false));
        assert!(PrivacyFilter::can_search(&PrivacyLevel::Private, false));
        assert!(PrivacyFilter::can_search(&PrivacyLevel::Sensitive, false));
        assert!(!PrivacyFilter::can_search(&PrivacyLevel::Sealed, false));
        assert!(PrivacyFilter::can_search(&PrivacyLevel::Sealed, true));
    }

    #[test]
    fn test_inject_and_confirm() {
        assert!(!PrivacyFilter::requires_confirmation(
            &PrivacyLevel::Standard
        ));
        assert!(!PrivacyFilter::requires_confirmation(
            &PrivacyLevel::Private
        ));
        assert!(PrivacyFilter::requires_confirmation(
            &PrivacyLevel::Sensitive
        ));
        assert!(!PrivacyFilter::requires_confirmation(&PrivacyLevel::Sealed));

        assert!(PrivacyFilter::can_inject(&PrivacyLevel::Sensitive, false));
        assert!(!PrivacyFilter::can_inject(&PrivacyLevel::Sealed, false));
        assert!(PrivacyFilter::can_inject(&PrivacyLevel::Sealed, true));
    }

    #[test]
    fn test_export() {
        assert!(PrivacyFilter::can_export(&PrivacyLevel::Standard, false));
        assert!(PrivacyFilter::can_export(&PrivacyLevel::Sensitive, false));
        assert!(!PrivacyFilter::can_export(&PrivacyLevel::Sealed, false));
        assert!(PrivacyFilter::can_export(&PrivacyLevel::Sealed, true));

        assert_eq!(PrivacyFilter::export_warning(&PrivacyLevel::Standard), None);
        assert!(PrivacyFilter::export_warning(&PrivacyLevel::Sensitive).is_some());
    }
}

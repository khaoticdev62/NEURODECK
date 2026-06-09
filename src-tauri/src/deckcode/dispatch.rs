use crate::bridge::EventEmitter;
use crate::deckcode::schema::Binding;

pub fn dispatch_action<E: EventEmitter>(emitter: &E, binding: &Binding) {
    let action_id = &binding.emit;

    tracing::info!("DeckCode Dispatching Action: {}", action_id);

    // Some actions execute via the backend directly (like terminal macros)
    // Most editor-specific actions will be forwarded to the frontend UI

    // In NEURODECK, most "palette.*", "caret.*", "ai.*", etc. commands need to go to the frontend
    // so `main.js` or the embedded Monaco editor can act on them.

    emitter.emit("deckcode-action", action_id.clone());
}

export const PROMPTDRIVE_SAFE_MACRO_STEPS = new Set([
  "select_template",
  "update_slot",
  "execute_prompt",
  "insert_saved_prompt",
  "accept_suggestion",
]);

export function validatePromptDriveSlots(template, slotValues) {
  const missingSlots = [];
  const errors = [];
  const slots = template?.slots || [];

  for (const slot of slots) {
    const value = String(slotValues?.[slot.id] ?? slot.default ?? "").trim();
    if (slot.required && !value) missingSlots.push(slot.id);
  }

  for (const key of Object.keys(slotValues || {})) {
    if (!slots.some((slot) => slot.id === key)) {
      errors.push(`Unknown slot '${key}'`);
    }
  }

  return {
    valid: missingSlots.length === 0 && errors.length === 0,
    missing_slots: missingSlots,
    errors,
  };
}

export function rankPromptDriveSuggestionsForDisplay(suggestions) {
  return [...(suggestions || [])]
    .filter((suggestion) => suggestion && typeof suggestion.label === "string")
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8);
}

export function reducePromptDriveMacroAction(state, action) {
  const next = {
    ...state,
    steps: [...(state.steps || [])],
  };

  if (action.type === "start") {
    return { recording: true, recordingId: action.recordingId, steps: [] };
  }

  if (action.type === "record_step") {
    if (
      !state.recording ||
      action.step?.requires_confirmation ||
      !PROMPTDRIVE_SAFE_MACRO_STEPS.has(action.step?.kind)
    ) {
      return next;
    }
    next.steps.push({
      ...action.step,
      payload: JSON.parse(JSON.stringify(action.step.payload || {})),
      requires_confirmation: false,
    });
    return next;
  }

  if (action.type === "stop") {
    return { ...next, recording: false, recordingId: null };
  }

  return next;
}

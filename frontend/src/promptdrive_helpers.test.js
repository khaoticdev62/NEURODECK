import { describe, expect, it } from "vitest";
import {
  rankPromptDriveSuggestionsForDisplay,
  reducePromptDriveMacroAction,
  validatePromptDriveSlots,
} from "./promptdrive_helpers.js";

describe("PromptDrive helper contracts", () => {
  const template = {
    slots: [
      { id: "task", required: true, default: "" },
      { id: "tone", required: false, default: "direct" },
    ],
  };

  it("reports missing required slots", () => {
    const result = validatePromptDriveSlots(template, {});
    expect(result.valid).toBe(false);
    expect(result.missing_slots).toEqual(["task"]);
  });

  it("rejects unknown slot values", () => {
    const result = validatePromptDriveSlots(template, { task: "review", extra: "bad" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unknown slot");
  });

  it("sorts suggestions by score and caps visible results", () => {
    const suggestions = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      label: `Suggestion ${index}`,
      score: index,
    }));
    const ranked = rankPromptDriveSuggestionsForDisplay(suggestions);
    expect(ranked).toHaveLength(8);
    expect(ranked[0].score).toBe(9);
    expect(ranked[7].score).toBe(2);
  });

  it("records only PromptDrive-safe macro steps", () => {
    const started = reducePromptDriveMacroAction(
      { recording: false, recordingId: null, steps: [] },
      { type: "start", recordingId: "draft-1" },
    );
    const withSafeStep = reducePromptDriveMacroAction(started, {
      type: "record_step",
      step: { kind: "update_slot", payload: { slot_id: "task", value: "review" } },
    });
    const withUnsafeStep = reducePromptDriveMacroAction(withSafeStep, {
      type: "record_step",
      step: { kind: "shell_command", payload: { command: "rm" } },
    });

    expect(withUnsafeStep.steps).toHaveLength(1);
    expect(withUnsafeStep.steps[0].requires_confirmation).toBe(false);
  });
});

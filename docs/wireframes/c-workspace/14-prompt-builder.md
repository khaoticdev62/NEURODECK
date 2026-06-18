# 14. Prompt Builder

**Category:** C — AI Workspace  
**Complexity:** Tier 2  
**Status:** Partial (inside `PromptLabView.tsx` — needs standalone panel)  
**Shell:** Full App Shell or Drawer from Prompt Library

---

## Purpose

Compose structured, effective prompts using goal/context/format/constraint fields — without long blank-page syndrome.

---

## Primary User Goal

Build a prompt that works well on the first try, then send it or save it.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Prompt Builder                        [─] [□] [×]      │
├──────┬──────────────────────────────┬─────────────────────────────────────────┤
│ Nav  │  [BUILDER FORM — scrollable] │  [PREVIEW PANEL]                       │
│ Rail │                              │                                         │
│      │  Goal                        │  Preview                                │
│      │  ┌────────────────────────┐  │  ─────────────────────────────────────  │
│      │  │ What do you want the   │  │  You are a senior software architect.  │
│      │  │ AI to do?              │  │  Review the following code for         │
│      │  └────────────────────────┘  │  security vulnerabilities and suggest  │
│      │                              │  improvements. Format the response      │
│      │  Context                     │  as a numbered list. Keep responses     │
│      │  ┌────────────────────────┐  │  concise and actionable.               │
│      │  │ What context should    │  │                                         │
│      │  │ the AI know?           │  │                                         │
│      │  └────────────────────────┘  │  ─────────────────────────────────────  │
│      │                              │  Token estimate: ~45 tokens             │
│      │  Output Format               │                                         │
│      │  [Prose ▾]                   │  [↑ Send to Chat]  [💾 Save Template]  │
│      │                              │                                         │
│      │  Tone                        │                                         │
│      │  [Professional ▾]            │                                         │
│      │                              │                                         │
│      │  Constraints                 │                                         │
│      │  ┌────────────────────────┐  │                                         │
│      │  │ Max length, avoid X…   │  │                                         │
│      │  └────────────────────────┘  │                                         │
│      │                              │                                         │
│      │  Tool Permissions            │                                         │
│      │  [✓ Web search] [✗ Bash]     │                                         │
├──────┴──────────────────────────────┴─────────────────────────────────────────┤
│ ControllerHintBar · [A] Send  [B] Back  [X] Clear  [Y] Save Template          │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Builder Form | Scrollable form fields | Goal, Context, Output Format, Tone, Constraints, Tool Permissions | Left 55% at 1280px |
| Preview Panel | Read-only `Panel` | Assembled prompt preview | Right 45%; updates live on form change |

---

## Form Fields

| Field | Component | Notes |
|-------|-----------|-------|
| Goal | Textarea | "What do you want the AI to do?" — required |
| Context | Textarea | Optional background context |
| Output Format | `Select` | Prose / Bullet list / Numbered list / Code / Table / JSON |
| Tone | `Select` | Professional / Casual / Technical / Creative / Academic |
| Constraints | Textarea | Optional — max length, avoid X, focus on Y |
| Tool Permissions | Toggle chips | web_search / bash / memory / file_read (optional) |

---

## Primary Action

**Label:** ↑ Send to Chat  
**Outcome:** Assembled prompt inserted into Workspace and sent immediately (or into composer for review)

---

## Secondary Actions

- **💾 Save Template** — opens Save dialog with Name + Tags fields → saves to Prompt Library
- **Clear** — clears all fields with `ConfirmDialog`
- **Copy preview** — copies assembled prompt text to clipboard

---

## States

### Empty Builder
- All fields empty, Preview shows placeholder: "Fill in the Goal field to see a preview."
- Send button disabled

### Validation Warning
- Goal field required — "Please enter a goal" error if Send attempted while empty
- Field highlighted with error border

### Ready to Send
- Preview populated
- Send and Save buttons enabled

### Saved Template
- Toast: "Template saved to Prompt Library"
- Builder stays open for continued editing

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.promptDrive` | `create(prompt)` — Save Template |
| Client-side | `dispatch({ type: "set-composer", value })` — Send to Chat |

---

## Controller / Keyboard Navigation

- **D-pad Up/Down:** Navigate fields
- **A:** Activate select dropdowns / toggle chips
- **B:** Back / cancel
- **X:** Clear all
- **Y:** Save Template
- **LB / RB:** Switch focus between form and preview panel

---

## Accessibility Notes

- Form: proper `<label htmlFor>` on all fields
- Preview: `aria-live="polite"` — announces when preview content updates
- Token estimate: `aria-label="Estimated token count: [N] tokens"`
- Tool toggles: `role="checkbox"`, `aria-checked`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/prompt-lab/PromptBuilderView.tsx` — extract from PromptLabView

**Preview assembly:**
```typescript
const assemblePrompt = ({ goal, context, format, tone, constraints }: BuilderForm) => {
  const parts = [
    tone && TONE_PREFIXES[tone],
    goal,
    context && `Context: ${context}`,
    format && `Format the response as: ${FORMAT_LABELS[format]}`,
    constraints && `Constraints: ${constraints}`,
  ].filter(Boolean)
  return parts.join("\n")
}
```

**Live preview:** Update on every keystroke (debounced 100ms for textarea fields).

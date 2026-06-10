# Volume III — Controller Runtime & Navigation Architecture

## Runtime Philosophy
PromptDrive is controller-native software. Keyboard support is a fallback, not the primary interaction model.

## Input Pipeline

```text
Steam Deck Hardware
  ↓
Steam Input Layer
  ↓
Controller Runtime
  ↓
Action Dispatcher
  ↓
Focus Manager
  ↓
UI Component
  ↓
PromptDrive System
```

## Rule
UI never consumes raw button input. UI dispatches semantic actions only.

## Action Registry

Navigation: NavigateUp, NavigateDown, NavigateLeft, NavigateRight, FocusNext, FocusPrevious, Accept, Back, Cancel.

PromptDrive: OpenPromptLibrary, AcceptSuggestion, NextSuggestion, PreviousSuggestion, ExecutePrompt, SavePrompt.

Commands: OpenCommandPalette, ExecuteCommand, CancelCommand.

Agents: OpenAgentWheel, SelectAgent, ExecuteWithAgent.

Macros: StartMacroRecording, StopMacroRecording, ReplayMacro.

## Steam Deck Default Mapping

| Input | Action |
|---|---|
| A | Accept |
| B | Back |
| X | Edit |
| Y | Context Menu |
| D-pad | Navigation |
| Left Stick | Navigation |
| Right Stick | Scroll |
| L1/R1 | Previous/Next Panel |
| L2/R2 | Previous/Next Category |
| L4 | Prompt Layer |
| L5 | Save Layer |
| R4 | Accept Suggestion |
| R5 | Command Layer |

## Chord Detection

Timing window: 150ms maximum between inputs.

Supported chords: L4+R4 complete prompt, L5+R5 macro recording, L4+L5 quick save, R4+R5 execute with current agent.

## Tap/Hold Detection

- Tap: 0–250ms.
- Hold: 250–1000ms.
- Long hold: 1000ms+ reserved.

## Focus Graph Engine

```ts
interface FocusNode {
  id: string;
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  enter?: string;
  back?: string;
}
```

Every screen has a root node, every node has a back path, and no dead ends are allowed.

## Trackpads and Gyro

Trackpads and gyro are supplemental, never required. Left trackpad may open radial navigation. Right trackpad may provide cursor precision.

## Suspend/Resume

Persist session state, prompt state, agent state, focus state, scroll state. Resume target under 2 seconds.

## Certification Gate

Cannot ship unless controller-only navigation, grip mapping, suspend/resume, docked mode, accessibility navigation, focus recovery, disconnect recovery, and 60 FPS all pass.

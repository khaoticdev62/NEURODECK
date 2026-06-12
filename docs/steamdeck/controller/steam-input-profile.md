# Steam Input Profile

This controller rollout is real app-side support first. The Steam Input layer stays optional and should be used to improve text-heavy workflows, not to compensate for missing navigation paths.

## Recommended action sets

1. `Default app layer`
   Use the in-app mapping documented in [default-controller-map.md](./default-controller-map.md).

2. `Text entry layer`
   Keep `Steam + X` available for the on-screen keyboard.
   Do not remap `A`, `B`, or `D-Pad` away from navigation while editing forms.

3. `Browser layer`
   Keep face buttons mapped to `confirm`, `back`, `reload`, and `search`.
   Leave trackpad mouse fallback enabled for site content that does not expose meaningful focus targets.

4. `Terminal layer`
   Keep a keyboard fallback available for shell-heavy sessions.
   Use Steam keyboard for command entry, then return to app navigation with `B`.

## Manual profile guidance

- Do not bind the Steam button or Quick Access button. Those stay system-reserved.
- Prefer joystick-as-gamepad, not joystick-as-mouse, for the default layer.
- Keep one trackpad as optional mouse fallback for embedded browser content.
- Keep `L4`/`R4`/`L5`/`R5` free for contextual power-user actions.

## Current runtime note

NEURODECK does not currently export a validated Steam Input profile automatically. Use the manual template in `packaging/steamdeck/controller/neurodeck-controller-layout.vdf` as a starting point, and verify bindings on real hardware before publishing it to users.

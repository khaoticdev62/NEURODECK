Triggers an immediate action or submits a command — the primary NEURODECK button, with a cyan controller-friendly focus ring.

```jsx
<Button variant="primary" onClick={run}>Run model</Button>
<Button variant="secondary" size="sm" icon={<PlusIcon/>}>New session</Button>
<Button variant="danger" shortcut="⌫">Delete session</Button>
<Button variant="ghost" loading>Connecting</Button>
```

Variants: `primary` (cyan, single main action), `secondary` (default), `ghost` (low-emphasis), `danger` (destructive verbs), `success`. Sizes `sm | md | lg`. Props: `loading`, `disabled`, `fullWidth`, `icon` + `iconPosition`, `shortcut`. Reserve `primary` for the one main action per surface; always label `danger` with the exact verb.

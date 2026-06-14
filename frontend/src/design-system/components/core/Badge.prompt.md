Compact, uppercase status/metadata pill. Always carries text — color is never the only signal. Six tones map to the semantic palette.

```jsx
<Badge tone="success" dot>Connected</Badge>
<Badge tone="agent">Agent</Badge>
<Badge tone="warning" variant="outline">Degraded</Badge>
<Badge tone="neutral" size="md">GGUF Q4</Badge>
```

Tones: `neutral | info | success | warning | error | agent`. Sizes `sm | md`, `variant` `fill | outline`, optional leading `dot`. Not for interactive controls.

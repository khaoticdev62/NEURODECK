Status indicator that pairs a mono glyph or pulsing dot with a label and tone color — NEURODECK never signals state with color alone.

```jsx
<StatusChip tone="success">Connected</StatusChip>
<StatusChip tone="warning">Degraded</StatusChip>
<StatusChip tone="error">Failed</StatusChip>
<StatusChip tone="info" pulse>Running</StatusChip>
```

Tones `info | success | warning | error` carry default glyphs `… ✓ ! ×`. Set `pulse` for live states, or override `glyph`.

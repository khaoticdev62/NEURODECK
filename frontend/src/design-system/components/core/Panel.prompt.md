The tactical-glass content surface: dark panel, hairline border, soft shadow, optional titled header + actions. Compose screen regions and cards from it.

```jsx
<Panel title="Diagnostics" description="Local subsystem health"
  actions={<IconButton label="Refresh" icon={<RefreshIcon/>} />}>
  …content…
</Panel>

<Panel emphasis="active" density="compact">Selected model details</Panel>
<Panel emphasis="critical" title="Storage pressure">3% free on /home</Panel>
```

`emphasis`: `default | raised | active` (cyan glow) `| critical` (red glow). `density`: `compact | normal | spacious`. Header renders only if `title`/`description`/`actions` are set.

Cyan on/off switch for settings and feature flags. Keyboard- and controller-operable.

```jsx
<Toggle checked={offline} onChange={setOffline} label="Offline-first mode" />
<Toggle checked={live} onChange={setLive} aria-label="Live wallpaper" />
```

Props: `checked`, `onChange(next)`, `label`, `disabled`. Always give a `label` or `aria-label`.

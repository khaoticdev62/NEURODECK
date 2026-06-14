Single-line text field with an uppercase HUD label, focus ring, optional leading icon, and hint/error messaging.

```jsx
<TextInput label="Session name" value={name} onChange={setName} placeholder="Security Lab Notes" />
<TextInput label="API key" type="password" value={key} onChange={setKey} hint="Stored locally, never synced" />
<TextInput label="Endpoint" value={url} onChange={setUrl} error="Must be a valid URL" />
```

Props: `label`, `value`, `onChange(value)`, `placeholder`, `error`, `hint`, `disabled`, `icon`, `type`, `onSubmit` (Enter). Error replaces hint and sets `aria-invalid`.

Temporary notification with a tone-colored left bar, status glyph, and optional dismiss. `error`/`warning` render as `role="alert"`.

```jsx
<Toast tone="success" title="Model connected" message="Llama 3.1 8B is ready." onClose={dismiss} />
<Toast tone="error" title="Connection failed" message="Check the provider endpoint." onClose={dismiss} />
```

Tones `info | success | warning | error`. Keep ≤ 3 visible; never make a critical error toast-only.

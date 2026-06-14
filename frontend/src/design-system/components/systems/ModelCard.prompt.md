Model-manager card showing a local/remote model's health, context size, VRAM estimate, throughput, and capability tags — with a recovery action for missing/auth states.

```jsx
<ModelCard name="Llama 3.1 8B" provider="Meta" location="local" status="selected"
  contextSize="8192" vram="6.2 GB" throughput="42" capabilities={['chat','tools']}
  onSelect={select} />
<ModelCard name="Claude Sonnet" provider="Anthropic" location="remote"
  status="auth-required" contextSize="200k" onFix={addKey} />
```

`status`: `available | selected | missing | unavailable | auth-required | degraded`. `missing`/`auth-required` swap the footer to a recovery button. Composes StatusChip, Badge, Button.

Agent/persona card: avatar, role, model binding, permission badges, trust state, and last-run status. Untrusted agents get a "Review & run" CTA.

```jsx
<AgentCard name="Recon" role="Read-only repo analyst" model="Llama 3.1 8B"
  trusted permissions={['filesystem','web']} runStatus="ok" onRun={run} />
<AgentCard name="Operator" role="Shell + file edits" trusted={false}
  permissions={['shell','filesystem']} runStatus="idle" onRun={review} />
```

`runStatus`: `idle | running | ok | failed`. `trusted={false}` swaps the primary CTA to review-first. Composes Badge, StatusChip, Button.

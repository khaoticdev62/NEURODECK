Session-browser row: title, updated time, model, message count, location + tags. The whole row opens; the `actions` slot holds per-item IconButtons.

```jsx
<SessionCard title="Security Lab Notes" updated="2h ago" model="Llama 3.1 8B"
  messageCount={48} location="local" tags={['research']} active onOpen={open}
  actions={<IconButton label="Archive" icon={<ArchiveIcon/>} size="sm" />} />
```

Set `active` for the current session. Clicks inside `actions` don't trigger `onOpen`.

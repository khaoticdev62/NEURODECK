Focus-trapping overlay for critical decisions. Closes on Escape / backdrop when `closable`; pass footer Buttons for actions.

```jsx
<Modal open={open} onClose={close} title="Connect remote provider"
  footer={<>
    <Button variant="ghost" onClick={close}>Cancel</Button>
    <Button variant="primary" onClick={save}>Connect</Button>
  </>}>
  <TextInput label="API key" value={key} onChange={setKey} />
</Modal>
```

`emphasis="critical"` adds a red glow for destructive/security dialogs. For confirmations, prefer `ConfirmDialog`.

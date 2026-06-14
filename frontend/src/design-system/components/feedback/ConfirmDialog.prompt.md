Confirmation for destructive/security actions. Forces the NEURODECK copy pattern: specific title, plain consequence, exact verb — never "Are you sure?".

```jsx
<ConfirmDialog
  open={open}
  title={'Delete session "Security Lab Notes"?'}
  consequence="This removes the local copy from this device. This cannot be undone."
  confirmLabel="Delete Session"
  onCancel={close}
  onConfirm={del}
/>
```

`tone`: `destructive | security` (red glow + danger button) or `safe` (cyan confirm). Built on `Modal`.

Compact icon-only button for toolbars and cards. Always pass an accessible `label` — it becomes the aria-label and the hover/focus tooltip.

```jsx
<IconButton label="Command palette" icon={<CommandIcon/>} variant="primary" />
<IconButton label="Close" icon={<XIcon/>} />
<IconButton label="Delete" icon={<TrashIcon/>} variant="danger" size="sm" />
```

Variants `default | primary | danger`, sizes `sm | md | lg`. Set `showTooltip={false}` to fall back to the native `title`. Never use `danger` for a one-tap destructive action without a ConfirmDialog.

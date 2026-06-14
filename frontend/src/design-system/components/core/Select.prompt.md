Native-backed select for constrained choices (model, provider, persona). Reliable keyboard + controller D-pad behaviour.

```jsx
<Select label="Model" value={model} onChange={setModel}
  options={['Llama 3.1 8B', 'Claude Sonnet', 'Qwen 2.5 14B']} />
<Select label="Provider" value={p} onChange={setP} placeholder="Select provider"
  options={[{value:'local',label:'Local'},{value:'remote',label:'Remote',disabled:true}]} />
```

Options accept plain strings or `{value,label,disabled}`. Supports `placeholder`, `error`, `disabled`.

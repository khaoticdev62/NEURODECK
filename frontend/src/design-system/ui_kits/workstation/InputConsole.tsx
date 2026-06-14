/* NEURODECK input console — primary prompt + command entry, pinned to bottom edge. */

import * as React from 'react';
import { Command, Box, Bot, Send } from 'lucide-react';

export interface InputConsoleProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onOpenPalette: () => void;
  model?: string;
  persona?: string;
  busy?: boolean;
}

export function InputConsole({ value, onChange, onSubmit, onOpenPalette, model, persona, busy }: InputConsoleProps): React.ReactNode {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (value.trim() && !busy) onSubmit(); }
  };
  return (
    <div style={{
      flex: 'none', borderTop: '1px solid var(--nd-border-subtle)', background: 'var(--nd-surface-app)',
      padding: 12,
    }}>
      <div style={{
        background: 'var(--nd-surface-input)', border: '1px solid var(--nd-border-default)',
        borderRadius: 'var(--nd-radius-lg)', padding: 10,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <textarea value={value} rows={2} placeholder="Send a prompt…  (Enter to send, Shift+Enter for newline)"
          onChange={(e) => onChange(e.target.value)} onKeyDown={handleKey}
          style={{
            resize: 'none', background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--nd-text-primary)', fontFamily: 'var(--nd-font-ui)', fontSize: 15,
            lineHeight: '22px', width: '100%',
          }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onOpenPalette} style={pill}>
            <Command size={13} /> Command
          </button>
          <span style={pillStatic}><Box size={12} /> {model}</span>
          <span style={pillStatic}><Bot size={12} /> {persona}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--nd-font-hud)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 9, color: 'var(--nd-text-muted)' }}>
              <span style={{ color: 'var(--nd-accent-success)', fontFamily: 'var(--nd-font-mono)', fontWeight: 700 }}>A</span> Send
            </span>
            <button onClick={() => { if (value.trim() && !busy) onSubmit(); }} disabled={!value.trim() || busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
                borderRadius: 'var(--nd-radius-md)', border: '1px solid rgba(var(--nd-cyan-rgb),0.3)',
                background: value.trim() && !busy ? 'rgba(var(--nd-cyan-rgb),0.14)' : 'transparent',
                color: value.trim() && !busy ? 'var(--nd-accent-primary)' : 'var(--nd-text-muted)',
                fontFamily: 'var(--nd-font-ui)', fontSize: 13, fontWeight: 600,
                cursor: value.trim() && !busy ? 'pointer' : 'not-allowed',
              }}>
              <Send size={14} /> {busy ? 'Running' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px',
  borderRadius: 'var(--nd-radius-full)', border: '1px solid var(--nd-border-default)',
  background: 'var(--nd-surface-tertiary)', color: 'var(--nd-text-secondary)',
  fontFamily: 'var(--nd-font-ui)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
};
const pillStatic = { ...pill, cursor: 'default', color: 'var(--nd-text-muted)' };

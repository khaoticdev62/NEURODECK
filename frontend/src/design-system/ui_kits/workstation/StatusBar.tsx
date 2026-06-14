/* NEURODECK top status bar — 40px persistent system status band. */

import * as React from 'react';
import { StatusChip } from '../../components/core/StatusChip';

export interface StatusBarProps {
  session?: string;
  model?: string;
  offline?: boolean;
  tokensPerSec?: string;
  vram?: string;
  clock?: string;
}

function Mark({ size = 22 }: { size?: number }): React.ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="var(--nd-accent-primary)" opacity="0.12" />
      <path d="M8 22l6-12 4 8 4-8 2 4" stroke="var(--nd-accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="22" r="2" fill="var(--nd-accent-primary)" />
    </svg>
  );
}

export function StatusBar({ session, model, offline, tokensPerSec, vram, clock }: StatusBarProps): React.ReactNode {
  return (
    <header style={{
      height: 40, flex: 'none', display: 'flex', alignItems: 'center', gap: 14,
      padding: '0 14px', background: 'var(--nd-surface-app)',
      borderBottom: '1px solid var(--nd-border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Mark size={22} />
        <span style={{
          fontFamily: 'var(--nd-font-display)', fontWeight: 800, fontSize: 13,
          letterSpacing: '0.2em', color: 'var(--nd-text-primary)',
        }}>NEURO<span style={{ color: 'var(--nd-accent-primary)' }}>DECK</span></span>
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--nd-border-subtle)' }} />

      <span style={hudLabel}>SESSION</span>
      <span style={{ fontSize: 12, color: 'var(--nd-text-secondary)', fontWeight: 500 }}>{session}</span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={metric}><b style={metricVal}>{tokensPerSec}</b> tok/s</span>
        <span style={metric}><b style={metricVal}>{vram}</b> vram</span>
        <StatusChip tone={offline ? 'warning' : 'success'} size="sm">
          {offline ? 'Offline' : 'Online'}
        </StatusChip>
        <span style={{ ...hudLabel, color: 'var(--nd-text-secondary)' }}>{model}</span>
        <span style={{ fontFamily: 'var(--nd-font-mono)', fontSize: 12, color: 'var(--nd-text-muted)' }}>{clock}</span>
      </div>
    </header>
  );
}

const hudLabel = {
  fontFamily: 'var(--nd-font-hud)', textTransform: 'uppercase', letterSpacing: '0.16em',
  fontSize: 10, color: 'var(--nd-text-muted)', fontWeight: 600,
};
const metric = { fontFamily: 'var(--nd-font-mono)', fontSize: 11, color: 'var(--nd-text-muted)' };
const metricVal = { color: 'var(--nd-accent-primary)', fontWeight: 600 };

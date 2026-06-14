import * as React from 'react';
import { StatusChip } from '../core/StatusChip';
import { Badge } from '../core/Badge';
import { Button } from '../core/Button';

if (typeof document !== 'undefined' && !document.getElementById('nd-modelcard-css')) {
  const s = document.createElement('style');
  s.id = 'nd-modelcard-css';
  s.textContent = `
  .nd-modelcard{background:var(--nd-surface-secondary);border:1px solid var(--nd-border-subtle);
    border-radius:var(--nd-radius-lg);box-shadow:var(--nd-elevation-card);padding:14px 16px;
    font-family:var(--nd-font-ui);color:var(--nd-text-primary);display:flex;flex-direction:column;gap:12px;
    transition:border-color var(--nd-motion-fast) var(--nd-ease-standard),box-shadow var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-modelcard--selected{border-color:rgba(var(--nd-cyan-rgb),0.45);box-shadow:var(--nd-elevation-card),0 0 22px rgba(var(--nd-cyan-rgb),0.14);}
  .nd-modelcard__top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .nd-modelcard__name{font-size:16px;font-weight:650;line-height:20px;}
  .nd-modelcard__provider{font-family:var(--nd-font-hud);text-transform:uppercase;letter-spacing:0.14em;
    font-size:10px;color:var(--nd-text-muted);margin-top:3px;}
  .nd-modelcard__meta{display:flex;gap:18px;flex-wrap:wrap;}
  .nd-modelcard__stat{display:flex;flex-direction:column;gap:1px;}
  .nd-modelcard__stat b{font-family:var(--nd-font-mono);font-size:14px;font-weight:600;color:var(--nd-accent-primary);}
  .nd-modelcard__stat span{font-family:var(--nd-font-hud);text-transform:uppercase;letter-spacing:0.12em;font-size:9px;color:var(--nd-text-muted);}
  .nd-modelcard__caps{display:flex;gap:6px;flex-wrap:wrap;}
  .nd-modelcard__foot{display:flex;gap:8px;}
  @media (prefers-reduced-motion: reduce){.nd-modelcard{transition:none;}}`;
  document.head.appendChild(s);
}

const STATUS_TONE: Record<ModelStatus, import('../core/StatusChip').StatusTone> = {
  available: 'info', selected: 'success', missing: 'error',
  unavailable: 'warning', 'auth-required': 'warning', degraded: 'warning',
};
const STATUS_LABEL = {
  available: 'Available', selected: 'Connected', missing: 'Missing',
  unavailable: 'Unavailable', 'auth-required': 'Auth required', degraded: 'Degraded',
};

export type ModelStatus =
  | 'available' | 'selected' | 'missing'
  | 'unavailable' | 'auth-required' | 'degraded';

/**
 * Displays a local or remote AI model's configuration and health.
 */
export interface ModelCardProps {
  name: string;
  /** Provider label, e.g. "Meta", "Anthropic", "Ollama". */
  provider: string;
  /** @default 'local' */
  location?: 'local' | 'remote';
  /** @default 'available' */
  status?: ModelStatus;
  /** Context window, e.g. "8192" or "200k". */
  contextSize?: string;
  /** VRAM / memory estimate, e.g. "6.2 GB". */
  vram?: string;
  /** Throughput, e.g. "42". */
  throughput?: string;
  /** Capability tags, e.g. ["chat","tools","vision"]. */
  capabilities?: string[];
  /** Select / make active. */
  onSelect?: () => void;
  /** Recovery action for missing/auth-required. */
  onFix?: () => void;
  className?: string;
}

export function ModelCard({
  name,
  provider,
  location = 'local',
  status = 'available',
  contextSize,
  vram,
  throughput,
  capabilities = [],
  onSelect,
  onFix,
  className = '',
}: ModelCardProps): React.ReactNode {
  const selected = status === 'selected';
  const needsFix = status === 'missing' || status === 'auth-required';
  return (
    <div className={['nd-modelcard', selected ? 'nd-modelcard--selected' : '', className].filter(Boolean).join(' ')}>
      <div className="nd-modelcard__top">
        <div>
          <div className="nd-modelcard__name">{name}</div>
          <div className="nd-modelcard__provider">{provider} · {location}</div>
        </div>
        <StatusChip tone={STATUS_TONE[status]} size="sm" pulse={status === 'selected'}>
          {STATUS_LABEL[status]}
        </StatusChip>
      </div>
      {(contextSize || vram || throughput) ? (
        <div className="nd-modelcard__meta">
          {contextSize ? <div className="nd-modelcard__stat"><b>{contextSize}</b><span>Context</span></div> : null}
          {vram ? <div className="nd-modelcard__stat"><b>{vram}</b><span>VRAM est.</span></div> : null}
          {throughput ? <div className="nd-modelcard__stat"><b>{throughput}</b><span>Tok/s</span></div> : null}
        </div>
      ) : null}
      {capabilities.length ? (
        <div className="nd-modelcard__caps">
          {capabilities.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
        </div>
      ) : null}
      <div className="nd-modelcard__foot">
        {needsFix
          ? <Button variant="primary" size="sm" fullWidth onClick={onFix}>
              {status === 'missing' ? 'Download model' : 'Add API key'}
            </Button>
          : <Button variant={selected ? 'secondary' : 'primary'} size="sm" fullWidth onClick={onSelect}>
              {selected ? 'Selected' : 'Select model'}
            </Button>}
      </div>
    </div>
  );
}

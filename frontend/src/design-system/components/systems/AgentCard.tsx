import * as React from 'react';
import { Badge } from '../core/Badge';
import { StatusChip } from '../core/StatusChip';
import { Button } from '../core/Button';

if (typeof document !== 'undefined' && !document.getElementById('nd-agentcard-css')) {
  const s = document.createElement('style');
  s.id = 'nd-agentcard-css';
  s.textContent = `
  .nd-agentcard{background:var(--nd-surface-secondary);border:1px solid var(--nd-border-subtle);
    border-radius:var(--nd-radius-lg);box-shadow:var(--nd-elevation-card);padding:14px 16px;
    font-family:var(--nd-font-ui);color:var(--nd-text-primary);display:flex;flex-direction:column;gap:12px;}
  .nd-agentcard__top{display:flex;align-items:flex-start;gap:12px;}
  .nd-agentcard__avatar{width:38px;height:38px;border-radius:var(--nd-radius-md);flex:none;
    display:flex;align-items:center;justify-content:center;font-family:var(--nd-font-display);font-weight:700;
    font-size:15px;color:var(--nd-accent-agent);background:rgba(var(--nd-purple-rgb),0.12);
    border:1px solid rgba(var(--nd-purple-rgb),0.3);}
  .nd-agentcard__id{flex:1;min-width:0;}
  .nd-agentcard__name{font-size:15px;font-weight:650;line-height:20px;}
  .nd-agentcard__role{font-size:12px;color:var(--nd-text-muted);line-height:16px;}
  .nd-agentcard__row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
  .nd-agentcard__bind{font-family:var(--nd-font-mono);font-size:11px;color:var(--nd-text-secondary);
    display:flex;align-items:center;gap:6px;}
  .nd-agentcard__bind b{color:var(--nd-accent-primary);font-weight:600;}
  .nd-agentcard__foot{display:flex;gap:8px;}`;
  document.head.appendChild(s);
}

const RUN_TONE: Record<AgentRunStatus, import('../core/StatusChip').StatusTone> = { idle: 'info', running: 'info', ok: 'success', failed: 'error' };
const RUN_LABEL = { idle: 'Idle', running: 'Running', ok: 'Last run OK', failed: 'Last run failed' };

export type AgentRunStatus = 'idle' | 'running' | 'ok' | 'failed';

/**
 * Displays an AI agent / persona / workflow unit, its model binding,
 * permissions, and trust state. Agents with tool/filesystem permissions show a
 * trust badge; untrusted agents must confirm before running.
 */
export interface AgentCardProps {
  name: string;
  /** One-line role/description. */
  role: string;
  /** Avatar initials; defaults to first two letters of name. */
  initials?: string;
  /** Bound model name. */
  model?: string;
  /** Trust state — false shows a warning badge and a review-before-run CTA. @default true */
  trusted?: boolean;
  /** Permission tags, e.g. ["filesystem","shell","web"]. */
  permissions?: string[];
  /** @default 'idle' */
  runStatus?: AgentRunStatus;
  onRun?: () => void;
  onConfigure?: () => void;
  className?: string;
}

export function AgentCard({
  name,
  role,
  initials,
  model,
  trusted = true,
  permissions = [],
  runStatus = 'idle',
  onRun,
  onConfigure,
  className = '',
}: AgentCardProps): React.ReactNode {
  return (
    <div className={['nd-agentcard', className].filter(Boolean).join(' ')}>
      <div className="nd-agentcard__top">
        <div className="nd-agentcard__avatar">{initials || name.slice(0, 2).toUpperCase()}</div>
        <div className="nd-agentcard__id">
          <div className="nd-agentcard__name">{name}</div>
          <div className="nd-agentcard__role">{role}</div>
        </div>
        <StatusChip tone={RUN_TONE[runStatus]} size="sm" pulse={runStatus === 'running'}>
          {RUN_LABEL[runStatus]}
        </StatusChip>
      </div>
      <div className="nd-agentcard__row">
        <Badge tone={trusted ? 'success' : 'warning'} dot>{trusted ? 'Trusted' : 'Untrusted'}</Badge>
        {permissions.map((p) => <Badge key={p} tone="agent">{p}</Badge>)}
      </div>
      {model ? (
        <div className="nd-agentcard__bind">Model · <b>{model}</b></div>
      ) : null}
      <div className="nd-agentcard__foot">
        <Button variant={trusted ? 'primary' : 'secondary'} size="sm" onClick={onRun}>
          {trusted ? 'Run agent' : 'Review & run'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onConfigure}>Configure</Button>
      </div>
    </div>
  );
}

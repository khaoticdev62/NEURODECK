/* NEURODECK feature views — Models, Agents, Sessions, Diagnostics — built from
   the design-system system cards. */

import * as React from 'react';
import { Plus, Copy, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { IconButton } from '../../components/core/IconButton';
import { Panel } from '../../components/core/Panel';
import { StatusChip } from '../../components/core/StatusChip';
import { AgentCard } from '../../components/systems/AgentCard';
import { ModelCard } from '../../components/systems/ModelCard';
import { SessionCard } from '../../components/systems/SessionCard';
import { NDIcon } from './icons';

interface ViewHeaderProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
}

function ViewHeader({ title, count, action }: ViewHeaderProps): React.ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 8px' }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--nd-text-primary)', fontFamily: 'var(--nd-font-ui)' }}>{title}</h1>
      {typeof count === 'number' ? <Badge tone="neutral" size="md">{count}</Badge> : null}
      <div style={{ marginLeft: 'auto' }}>{action}</div>
    </div>
  );
}

interface GridViewProps {
  children: React.ReactNode;
}

function GridView({ children }: GridViewProps): React.ReactNode {
  return <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignContent: 'start' }}>{children}</div>;
}

interface ModelsViewProps {
  selected?: string;
  onSelect?: (name: string) => void;
}

export function ModelsView({ selected, onSelect }: ModelsViewProps): React.ReactNode {
  return (
    <>
      <ViewHeader title="Models" count={4} action={<Button variant="primary" size="sm" icon={<Plus size={15} />}>Add model</Button>} />
      <GridView>
        <ModelCard name="Llama 3.1 8B" provider="Meta · Ollama" location="local" status={selected === 'Llama 3.1 8B' ? 'selected' : 'available'} contextSize="8192" vram="6.2 GB" throughput="42" capabilities={['chat', 'tools']} onSelect={() => onSelect && onSelect('Llama 3.1 8B')} />
        <ModelCard name="Qwen 2.5 14B" provider="Alibaba · Ollama" location="local" status={selected === 'Qwen 2.5 14B' ? 'selected' : 'available'} contextSize="32k" vram="9.8 GB" throughput="28" capabilities={['chat', 'code']} onSelect={() => onSelect && onSelect('Qwen 2.5 14B')} />
        <ModelCard name="Claude Sonnet" provider="Anthropic" location="remote" status="auth-required" contextSize="200k" capabilities={['chat', 'vision', 'tools']} />
        <ModelCard name="Phi-3 Mini" provider="Microsoft" location="local" status="missing" contextSize="4096" capabilities={['chat']} />
      </GridView>
    </>
  );
}

export function AgentsView(): React.ReactNode {
  return (
    <>
      <ViewHeader title="Agents" count={3} action={<Button variant="primary" size="sm" icon={<Plus size={15} />}>New agent</Button>} />
      <GridView>
        <AgentCard name="Recon" role="Read-only repo analyst" model="Llama 3.1 8B" trusted permissions={['filesystem', 'web']} runStatus="ok" />
        <AgentCard name="Operator" role="Shell + file edits" trusted={false} permissions={['shell', 'filesystem']} runStatus="idle" />
        <AgentCard name="Scribe" role="Docs & changelog writer" model="Claude Sonnet" trusted permissions={['filesystem']} runStatus="running" />
        <AgentCard name="Sentinel" role="Security log triage" model="Qwen 2.5 14B" trusted permissions={['web']} runStatus="failed" />
      </GridView>
    </>
  );
}

interface SessionData {
  title: string;
  updated?: string;
  model?: string;
  messageCount?: number;
  location?: 'local' | 'remote';
  tags?: string[];
  active?: boolean;
}

interface SessionsViewProps {
  onOpen?: () => void;
}

export function SessionsView({ onOpen }: SessionsViewProps): React.ReactNode {
  const data: SessionData[] = [
    { title: 'Security Lab Notes', updated: '2h ago', model: 'Llama 3.1 8B', messageCount: 48, location: 'local', tags: ['research'], active: true },
    { title: 'Onboarding wizard copy', updated: 'yesterday', model: 'Claude Sonnet', messageCount: 12, location: 'remote', tags: ['writing'] },
    { title: 'Rust panic triage', updated: '3d ago', model: 'Qwen 2.5 14B', messageCount: 64, location: 'local', tags: ['debug'] },
    { title: 'Plugin manifest review', updated: 'last week', model: 'Llama 3.1 8B', messageCount: 20, location: 'local', tags: ['plugins'] },
  ];
  return (
    <>
      <ViewHeader title="Sessions" count={data.length} action={<Button variant="primary" size="sm" icon={<Plus size={15} />}>New session</Button>} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((s) => (
          <SessionCard key={s.title} {...s} onOpen={onOpen}
            actions={<><IconButton label="Rename" icon={<NDIcon size={15}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></NDIcon>} size="sm" />
            <IconButton label="Duplicate" icon={<Copy size={15} />} size="sm" /></>} />
        ))}
      </div>
    </>
  );
}

interface DiagnosticCheck {
  label: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  detail: string;
}

export function DiagnosticsView(): React.ReactNode {
  const checks: DiagnosticCheck[] = [
    { label: 'Electron renderer', tone: 'success', detail: 'Healthy · 142 MB' },
    { label: 'Local model runtime', tone: 'success', detail: 'Ollama · 2 models loaded' },
    { label: 'Hermes extensions', tone: 'warning', detail: '1 plugin needs permission review' },
    { label: 'Network / sync', tone: 'warning', detail: 'Offline — prompts queued locally' },
    { label: 'Storage', tone: 'success', detail: '38 GB free on /home' },
    { label: 'Steam Deck compat', tone: 'success', detail: '1280×800 · controller mapped' },
  ];
  return (
    <>
      <ViewHeader title="Diagnostics" action={<Button variant="secondary" size="sm" icon={<RefreshCw size={15} />}>Run doctor</Button>} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checks.map((c) => (
          <Panel key={c.label} density="compact" emphasis="default">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusChip tone={c.tone}>{c.tone === 'success' ? 'Pass' : 'Warn'}</StatusChip>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--nd-text-primary)' }}>{c.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--nd-font-mono)', fontSize: 12, color: 'var(--nd-text-muted)' }}>{c.detail}</span>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

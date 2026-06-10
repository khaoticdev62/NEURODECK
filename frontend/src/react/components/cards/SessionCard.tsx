import { MessageSquareText } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import type { SessionNode } from '../../types/neurodeck';

interface SessionCardProps {
  node: SessionNode;
}

export function SessionCard({ node }: SessionCardProps) {
  return (
    <article className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 text-nd-accent">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-nd-text">{node.title}</h4>
            <p className="text-xs uppercase tracking-[0.18em] text-nd-text-muted/70">{node.type}</p>
          </div>
        </div>
        <Badge
          tone={
            node.status === 'active'    ? 'accent'   :
            node.status === 'complete'  ? 'success'  : 'neutral'
          }
        >
          {node.status}
        </Badge>
      </div>
    </article>
  );
}

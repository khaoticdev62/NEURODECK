import { AlertTriangle } from "lucide-react";
import type { PermissionRequest } from "../types";
import { Button } from "../../../components/primitives/Button";

interface PermissionPromptProps {
  permissions: PermissionRequest[];
  onRespond: (requestId: string, decision: string) => void;
}

export function PermissionPrompt({ permissions, onRespond }: PermissionPromptProps) {
  if (permissions.length === 0) return null;

  const request = permissions[0];

  return (
    <div className="absolute top-4 left-1/2 z-[var(--z-toast)] w-96 -translate-x-1/2 rounded-2xl border border-nd-accent-primary/30 bg-nd-surface-app/95 p-4 shadow-2xl flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-nd-accent-warning"
          aria-hidden="true"
        />
        <div>
          <h4 className="text-sm font-semibold text-nd-text-primary">Permission Request</h4>
          <p className="mt-1 text-xs leading-relaxed text-nd-text-muted">
            The site <code className="text-nd-accent-primary">{request.origin}</code>{" "}
            requests access to{" "}
            <code className="text-nd-accent-primary">{request.permission}</code>.
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          variant="primary"
          size="xs"
          fullWidth
          onClick={() => onRespond(request.requestId, "allow_once")}
        >
          Allow Once
        </Button>
        <Button
          variant="success"
          size="xs"
          fullWidth
          onClick={() => onRespond(request.requestId, "allow_always")}
        >
          Allow Always
        </Button>
        <Button
          variant="secondary"
          size="xs"
          fullWidth
          onClick={() => onRespond(request.requestId, "block_once")}
        >
          Block Once
        </Button>
        <Button
          variant="danger"
          size="xs"
          fullWidth
          onClick={() => onRespond(request.requestId, "block_always")}
        >
          Block Always
        </Button>
      </div>
    </div>
  );
}

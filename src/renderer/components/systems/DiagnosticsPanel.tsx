import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type CheckStatus = "pass" | "warn" | "fail";

interface DiagnosticsCheck {
  id: string;
  label: string;
  detail?: string;
  status: CheckStatus;
}

interface DiagnosticsPanelProps {
  checks: DiagnosticsCheck[];
  title?: string;
}

const statusIcon: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-nd-accent-success" />,
  warn: <AlertTriangle className="h-4 w-4 text-nd-accent-warning" />,
  fail: <XCircle className="h-4 w-4 text-nd-accent-error" />,
};

const statusClass: Record<CheckStatus, string> = {
  pass: "border-nd-accent-success/15 bg-nd-accent-success/[0.04]",
  warn: "border-nd-accent-warning/20 bg-nd-accent-warning/[0.06]",
  fail: "border-nd-accent-error/20 bg-nd-accent-error/[0.06]",
};

export function DiagnosticsPanel({ checks, title }: DiagnosticsPanelProps) {
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  const overallStatus: CheckStatus = failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass";

  return (
    <div role="list" aria-label={title ?? "Diagnostics"}>
      {/* Summary row */}
      <div
        className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${statusClass[overallStatus]}`}
      >
        <span className="flex items-center gap-1.5 font-semibold text-nd-text-primary/90">
          {statusIcon[overallStatus]}
          {overallStatus === "pass"
            ? "All checks passing"
            : overallStatus === "warn"
              ? "Warnings present"
              : "Failures detected"}
        </span>
        <span className="text-nd-text-muted">
          {passCount}✓ {warnCount > 0 && `${warnCount}⚠ `}
          {failCount > 0 && `${failCount}✗`}
        </span>
      </div>

      <div className="space-y-1.5">
        {checks.map((check) => (
          <div
            key={check.id}
            role="listitem"
            className={`rounded-xl border px-3 py-2.5 ${statusClass[check.status]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-medium text-nd-text-primary/90">
                {statusIcon[check.status]}
                {check.label}
              </span>
            </div>
            {check.detail && (
              <p className="mt-1 pl-6 text-[11px] leading-4 text-nd-text-muted">{check.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { DiagnosticsCheck };

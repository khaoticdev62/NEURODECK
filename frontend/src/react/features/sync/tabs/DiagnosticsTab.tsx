import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { TransferDiagnostics } from '../../../services/bridgeAdapter';
import { LoadingState } from '../../../components/primitives/LoadingState';
import { ErrorState } from '../../../components/primitives/ErrorState';
import { IconButton } from '../../../components/primitives/IconButton';
import { Panel } from '../../../components/primitives/Panel';
import { Badge } from '../../../components/primitives/Badge';

interface DiagRow {
  label: string;
  value: string;
  ok: boolean;
}

export function DiagnosticsTab() {
  const [diag, setDiag] = useState<TransferDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await neurodeckApi.transfer.diagnostics();
      setDiag(res.diagnostics);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows: DiagRow[] = diag
    ? [
        { label: 'mDNS discovery', value: diag.mdns_active ? 'Active' : 'Inactive', ok: diag.mdns_active },
        { label: 'TCP transfer port', value: `${diag.tcp_port}`, ok: true },
        { label: 'Warpinator gRPC port', value: `${diag.grpc_port}`, ok: true },
        { label: 'Peers discovered', value: String(diag.peer_count), ok: diag.peer_count > 0 },
        { label: 'Active transfers', value: String(diag.active_transfers), ok: true },
        { label: 'Group code set', value: diag.group_code_set ? 'Yes' : 'No (using DEFAULT)', ok: diag.group_code_set },
        { label: 'Receive folder', value: diag.download_dir, ok: true },
      ]
    : [];

  return (
    <Panel
      eyebrow="Health"
      title="Transfer Subsystem Diagnostics"
      action={
        <IconButton
          type="button"
          size="md"
          variant="subtle"
          aria-label="Refresh diagnostics"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
        </IconButton>
      }
      className="h-full"
    >
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        {loading && <LoadingState label="Running diagnostics…" />}

        {!loading && error && (
          <ErrorState title="Diagnostics failed" message={error} onRetry={refresh} retryLabel="Retry" />
        )}

        {!loading && diag && (
          <>
            <div className="overflow-hidden rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40">
              <table className="w-full text-sm" role="table" aria-label="Transfer diagnostic results">
                <thead>
                  <tr className="border-b border-nd-border-subtle bg-nd-surface-secondary/60">
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-nd-text-muted">
                      Check
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-nd-text-muted">
                      Value
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-nd-text-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-nd-border-subtle/50 last:border-0">
                      <td className="px-4 py-2.5 text-nd-text-secondary">{row.label}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-nd-text-primary break-all">{row.value}</td>
                      <td className="px-4 py-2.5">
                        {row.ok ? (
                          <Badge tone="success" variant="outline" size="sm">OK</Badge>
                        ) : (
                          <Badge tone="warning" variant="outline" size="sm">Warn</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60">
                  <Activity className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
                </div>
                <div className="space-y-1 text-xs text-nd-text-muted">
                  <p className="font-semibold text-nd-text-primary">Firewall requirements</p>
                  <p>
                    TCP port <span className="font-mono text-nd-accent-primary">18338</span> — NEURODECK P2P transfer
                  </p>
                  <p>
                    TCP port <span className="font-mono text-nd-accent-primary">42000</span> — Warpinator gRPC
                  </p>
                  <p>
                    UDP port <span className="font-mono text-nd-accent-primary">5353</span> — mDNS peer discovery (multicast)
                  </p>
                  <p className="pt-1">
                    If peers are not discovered, ensure mDNS (multicast) is allowed on your router/firewall. For VPN peers, add them manually in the Devices tab.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

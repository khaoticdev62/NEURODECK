import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { TransferDiagnostics } from '../../../services/bridgeAdapter';
import { LoadingState } from '../../../components/primitives/LoadingState';

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
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Transfer Subsystem Diagnostics</h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh diagnostics"
          className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {loading && <LoadingState label="Running diagnostics…" />}
      {!loading && error && (
        <div role="alert" className="rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-4 py-3 text-sm text-nd-danger">
          {error}
        </div>
      )}

      {!loading && diag && (
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
          <table className="w-full text-sm" role="table" aria-label="Transfer diagnostic results">
            <thead>
              <tr className="border-b border-nd-text-muted/10">
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-nd-text-muted">Check</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-nd-text-muted">Value</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-nd-text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-nd-text-muted/5 last:border-0">
                  <td className="px-4 py-2 text-nd-text-muted">{row.label}</td>
                  <td className="px-4 py-2 font-mono text-xs text-nd-text break-all">{row.value}</td>
                  <td className="px-4 py-2">
                    {row.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-nd-success" aria-label="OK" />
                    ) : (
                      <XCircle className="h-4 w-4 text-nd-warning" aria-label="Warning" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/20 p-4">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-nd-text-muted" aria-hidden="true" />
          <div className="text-xs text-nd-text-muted space-y-1">
            <p className="font-medium text-nd-text">Firewall requirements</p>
            <p>TCP port <span className="font-mono text-nd-accent">18338</span> — NEURODECK P2P transfer</p>
            <p>TCP port <span className="font-mono text-nd-accent">42000</span> — Warpinator gRPC</p>
            <p>UDP port <span className="font-mono text-nd-accent">5353</span> — mDNS peer discovery (multicast)</p>
            <p className="pt-1">If peers are not discovered, ensure mDNS (multicast) is allowed on your router/firewall. For VPN peers, add them manually in the Devices tab.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Send, FolderOpen } from 'lucide-react';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { TransferPeer } from '../../../services/bridgeAdapter';

interface Props {
  peers: TransferPeer[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function SendTab({ peers, onSuccess, onError }: Props) {
  const [filePath, setFilePath] = useState('');
  const [selectedPeerIp, setSelectedPeerIp] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = filePath.trim() && selectedPeerIp;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const result = await neurodeckApi.transfer.sendFile(selectedPeerIp, filePath.trim());
      onSuccess(`Transfer started: ${result.transfer_id}`);
      setFilePath('');
    } catch (e) {
      onError(`Send failed: ${e}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-1">
      <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5">
        <h3 className="mb-4 text-sm font-semibold text-nd-text">Send a File or Folder</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="sync-file-path" className="mb-1 block text-xs font-medium text-nd-text-muted">
              File or folder path
            </label>
            <div className="flex gap-2">
              <input
                id="sync-file-path"
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/home/deck/Documents/report.pdf"
                className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              />
            </div>
            <p className="mt-1 text-xs text-nd-text-muted">
              Folders are automatically archived and extracted on the receiving end.
            </p>
          </div>

          <div>
            <label htmlFor="sync-peer-select" className="mb-1 block text-xs font-medium text-nd-text-muted">
              Destination peer
            </label>
            {peers.length === 0 ? (
              <p className="text-xs text-nd-text-muted">No peers discovered yet — check the Devices tab.</p>
            ) : (
              <select
                id="sync-peer-select"
                value={selectedPeerIp}
                onChange={(e) => setSelectedPeerIp(e.target.value)}
                aria-label="Select destination peer"
                className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              >
                <option value="">— Choose peer —</option>
                {peers.map((p) => (
                  <option key={p.ip} value={p.ip}>
                    {p.hostname} ({p.ip})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend || sending}
            className="flex items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2.5 text-sm font-semibold text-nd-accent hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:pointer-events-none disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/20 p-4">
        <div className="flex items-start gap-3">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-nd-text-muted" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-nd-text">Transfer tips</p>
            <ul className="mt-1 space-y-0.5 text-xs text-nd-text-muted">
              <li>Files are streamed — no memory cap; supports 100 GB+ transfers.</li>
              <li>Folders are automatically tar'd before sending and extracted on arrival.</li>
              <li>The receiving device must Accept the request in their Inbox tab.</li>
              <li>For VPN/WAN peers, add them manually in the Devices tab first.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

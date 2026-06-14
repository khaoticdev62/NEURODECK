import { useState } from 'react';
import { Send, FolderOpen } from 'lucide-react';
import { Button } from '../../../components/primitives/Button';
import { Panel } from '../../../components/primitives/Panel';
import { Select } from '../../../components/primitives/Select';
import { TextInput } from '../../../components/primitives/TextInput';
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

  const peerOptions = peers.map((p) => ({ value: p.ip, label: `${p.hostname} (${p.ip})` }));

  return (
    <Panel eyebrow="Send" title="Send a File or Folder" className="h-full">
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
          <div className="flex flex-col gap-3">
            <TextInput
              id="sync-file-path"
              label="File or folder path"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/home/deck/Documents/report.pdf"
              fullWidth
            />

            {peers.length === 0 ? (
              <p className="text-xs text-nd-text-muted">No peers discovered yet — check the Devices tab.</p>
            ) : (
              <Select
                id="sync-peer-select"
                label="Destination peer"
                value={selectedPeerIp}
                onChange={(e) => setSelectedPeerIp(e.target.value)}
                options={peerOptions}
                placeholder="— Choose peer —"
                fullWidth
              />
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              icon={Send}
              loading={sending}
              disabled={!canSend || sending}
              onClick={() => void handleSend()}
            >
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60">
              <FolderOpen className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-nd-text-primary">Transfer tips</p>
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
    </Panel>
  );
}

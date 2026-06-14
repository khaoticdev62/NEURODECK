import { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { neurodeckApi } from '../../../services/bridgeAdapter';

interface Props {
  groupCode: string;
  inboxPath: string;
  onGroupCodeChange: (code: string) => void;
  onError: (msg: string) => void;
}

export function SettingsTab({ groupCode, inboxPath, onGroupCodeChange, onError }: Props) {
  const [codeInput, setCodeInput] = useState(groupCode);
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (codeInput.trim()) {
        await neurodeckApi.transfer.groupCode('set', codeInput.trim());
        onGroupCodeChange(codeInput.trim());
      } else {
        await neurodeckApi.transfer.groupCode('clear');
        onGroupCodeChange('');
      }
    } catch (e) {
      onError(`Failed to update group code: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(groupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-1">
      {/* Group code */}
      <section aria-label="Group code security">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Group Code</h3>
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 space-y-3">
          <p className="text-xs text-nd-text-muted">
            The group code is broadcast via mDNS. Only peers with a matching group code can initiate transfers. Set a unique code for added security.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="sync-group-code"
                type={showCode ? 'text' : 'password'}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter group code…"
                aria-label="Group code"
                className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 pr-8 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                aria-label={showCode ? 'Hide group code' : 'Show group code'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-nd-text-muted hover:text-nd-text"
              >
                {showCode ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {groupCode && (
              <button
                type="button"
                onClick={() => void handleCopy()}
                aria-label="Copy group code"
                className="rounded-xl border border-nd-text-muted/15 px-3 py-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              >
                {copied ? <Check className="h-4 w-4 text-nd-success" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-4 py-2 text-sm font-medium text-nd-accent hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:pointer-events-none disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {groupCode && (
            <p className="text-xs text-nd-success">
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Group code is active. Only peers with the same code can connect.
            </p>
          )}
          {!groupCode && (
            <p className="text-xs text-nd-warning">
              No group code set — using DEFAULT. Any Warpinator peer on the network can discover this device.
            </p>
          )}
        </div>
      </section>

      {/* Inbox path */}
      <section aria-label="Receive folder">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Receive Folder</h3>
        <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-3">
          <p className="break-all font-mono text-xs text-nd-text-muted">{inboxPath || '—'}</p>
          <p className="mt-1 text-xs text-nd-text-muted">All incoming files are saved here. The folder is created automatically if it does not exist.</p>
        </div>
      </section>

      {/* Security notes */}
      <section aria-label="Security notes">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Security Notes</h3>
        <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/20 p-4 space-y-1 text-xs text-nd-text-muted">
          <p>• Incoming files land in the isolated receive folder — not your home directory.</p>
          <p>• Symlinks, hardlinks, device nodes, and path traversal attempts (<code className="font-mono">../</code>) are blocked by the backend.</p>
          <p>• Unknown peers cannot send files silently — you must explicitly Accept each request.</p>
          <p>• WAN transfers require VPN or manual peer entry — NEURODECK Sync does not expose a public endpoint.</p>
        </div>
      </section>
    </div>
  );
}

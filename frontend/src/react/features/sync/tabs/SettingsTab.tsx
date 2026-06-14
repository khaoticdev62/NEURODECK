import { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '../../../components/primitives/Button';
import { IconButton } from '../../../components/primitives/IconButton';
import { Panel } from '../../../components/primitives/Panel';
import { Badge } from '../../../components/primitives/Badge';
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
    <Panel eyebrow="Settings" title="Sync Settings" className="h-full">
      <div className="flex h-full flex-col gap-5 overflow-y-auto">
        {/* Group code */}
        <section aria-label="Group code security">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Group Code
          </h3>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 space-y-3">
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
                  className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-input px-3 py-2 pr-9 text-sm text-nd-text-primary outline-none placeholder:text-nd-text-muted focus:border-nd-accent-primary focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
                />
                <IconButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={showCode ? 'Hide group code' : 'Show group code'}
                  onClick={() => setShowCode((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                >
                  {showCode ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconButton>
              </div>
              {groupCode && (
                <IconButton
                  type="button"
                  size="md"
                  variant="subtle"
                  aria-label="Copy group code"
                  onClick={() => void handleCopy()}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-nd-success" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconButton>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {groupCode && (
              <p className="flex items-center gap-1.5 text-xs text-nd-success">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Group code is active. Only peers with the same code can connect.
                <Badge tone="success" variant="outline" size="sm">Active</Badge>
              </p>
            )}
            {!groupCode && (
              <p className="flex items-center gap-1.5 text-xs text-nd-warning">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                No group code set — using DEFAULT. Any Warpinator peer on the network can discover this device.
              </p>
            )}
          </div>
        </section>

        {/* Inbox path */}
        <section aria-label="Receive folder">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Receive Folder
          </h3>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-3">
            <p className="break-all font-mono text-xs text-nd-text-secondary">{inboxPath || '—'}</p>
            <p className="mt-1 text-xs text-nd-text-muted">
              All incoming files are saved here. The folder is created automatically if it does not exist.
            </p>
          </div>
        </section>

        {/* Security notes */}
        <section aria-label="Security notes">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Security Notes
          </h3>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 space-y-1 text-xs text-nd-text-muted">
            <p>• Incoming files land in the isolated receive folder — not your home directory.</p>
            <p>• Symlinks, hardlinks, device nodes, and path traversal attempts (<code className="font-mono">../</code>) are blocked by the backend.</p>
            <p>• Unknown peers cannot send files silently — you must explicitly Accept each request.</p>
            <p>• WAN transfers require VPN or manual peer entry — NEURODECK Sync does not expose a public endpoint.</p>
          </div>
        </section>
      </div>
    </Panel>
  );
}

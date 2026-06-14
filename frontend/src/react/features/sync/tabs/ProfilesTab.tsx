import { useCallback, useEffect, useState } from 'react';
import { IdCard, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { SyncProfile, TrustedPeer } from '../../../services/bridgeAdapter';

interface Props {
  groupCode: string;
  inboxPath: string;
  trustedPeers: TrustedPeer[];
  onError: (msg: string) => void;
}

export function ProfilesTab({ groupCode, inboxPath, trustedPeers, onError }: Props) {
  const [profiles, setProfiles] = useState<SyncProfile[]>([]);
  const [name, setName] = useState('Home LAN');
  const [mode, setMode] = useState<SyncProfile['mode']>('lan');
  const [vpnOnly, setVpnOnly] = useState(false);
  const [autoAcceptTrusted, setAutoAcceptTrusted] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshProfiles = useCallback(async () => {
    try {
      const res = await neurodeckApi.transfer.profiles('list');
      setProfiles(res.profiles ?? []);
    } catch (e) {
      onError(`Profile load failed: ${e}`);
    }
  }, [onError]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await neurodeckApi.transfer.profiles('add', {
        name: name.trim(),
        mode,
        enabled: true,
        preferred_interface: vpnOnly ? 'vpn-auto' : 'auto',
        incoming_folder: inboxPath,
        auto_accept_trusted: autoAcceptTrusted,
        compression: 'auto',
        vpn_only: vpnOnly,
      });
      setName('');
      await refreshProfiles();
    } catch (e) {
      onError(`Profile save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await neurodeckApi.transfer.profiles('remove', { id });
      await refreshProfiles();
    } catch (e) {
      onError(`Profile remove failed: ${e}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-1">
      <section aria-label="Create sync profile" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Create Profile</h3>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Profile name"
            placeholder="Profile name"
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SyncProfile['mode'])}
            aria-label="Profile mode"
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          >
            <option value="lan">LAN</option>
            <option value="vpn_manual">VPN Manual</option>
            <option value="vpn_mesh">VPN Mesh</option>
            <option value="hybrid">Hybrid</option>
            <option value="receive_only">Receive Only</option>
            <option value="send_only">Send Only</option>
          </select>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2 text-sm font-medium text-nd-accent hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Save
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-nd-text-muted">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={vpnOnly} onChange={(e) => setVpnOnly(e.target.checked)} />
            VPN-only lock
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={autoAcceptTrusted} onChange={(e) => setAutoAcceptTrusted(e.target.checked)} />
            Auto-accept trusted peers
          </label>
        </div>
      </section>

      <section aria-label="Saved sync profiles">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Saved Profiles</h3>
          <span className="text-xs text-nd-text-muted">{trustedPeers.length} trusted peers · group {groupCode ? 'set' : 'default'}</span>
        </div>
        {profiles.length === 0 ? (
          <EmptyState icon={IdCard} title="No profiles saved" description="Save LAN, VPN, receive-only, or travel profiles here." />
        ) : (
          <ul role="list" className="grid gap-2 lg:grid-cols-2">
            {profiles.map((profile) => (
              <li key={profile.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
                <div className="flex items-start gap-3">
                  <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nd-text">{profile.name}</p>
                    <p className="mt-1 text-xs text-nd-text-muted">
                      {profile.mode.replace('_', ' ')} · {profile.vpn_only ? 'VPN-only' : 'LAN allowed'} · {profile.auto_accept_trusted ? 'trusted auto-accept' : 'manual accept'}
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] text-nd-text-muted">{profile.incoming_folder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(profile.id)}
                    aria-label={`Remove profile ${profile.name}`}
                    className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-danger/10 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-danger/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

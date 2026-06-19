import { useCallback, useState } from "react";
import { Shield, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { TextInput } from "../../components/primitives/TextInput";
import { Toggle } from "../../components/primitives/Toggle";

type Protocol = "wireguard" | "openvpn";

interface ProfilePayload {
  id?: string;
  name: string;
  protocol: Protocol;
  endpoint: string;
  privateKey: string;
  autoConnect: boolean;
}

interface NetworkProfileDrawerProps {
  open: boolean;
  editProfile?: ProfilePayload | null;
  onClose: () => void;
  onSave: (profile: ProfilePayload) => void | Promise<void>;
}

export function NetworkProfileDrawer({
  open,
  editProfile,
  onClose,
  onSave,
}: NetworkProfileDrawerProps) {
  const [name, setName] = useState(editProfile?.name ?? "");
  const [protocol, setProtocol] = useState<Protocol>(editProfile?.protocol ?? "wireguard");
  const [endpoint, setEndpoint] = useState(editProfile?.endpoint ?? "");
  const [privateKey, setPrivateKey] = useState(editProfile?.privateKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [autoConnect, setAutoConnect] = useState(editProfile?.autoConnect ?? false);
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const isDirty =
    name !== (editProfile?.name ?? "") ||
    endpoint !== (editProfile?.endpoint ?? "") ||
    privateKey !== (editProfile?.privateKey ?? "");

  const handleClose = () => {
    if (isDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  };

  const handleSave = useCallback(async () => {
    if (!name.trim() || !endpoint.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editProfile?.id,
        name: name.trim(),
        protocol,
        endpoint: endpoint.trim(),
        privateKey,
        autoConnect,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [name, endpoint, privateKey, protocol, autoConnect, editProfile, onSave, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-nd-bg/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editProfile ? "Edit Network Profile" : "Add Network Profile"}
          className="relative z-10 flex h-full w-full max-w-[480px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Network
              </p>
              <h2 className="mt-1 text-lg font-black text-nd-text-primary">
                {editProfile ? "Edit Profile" : "New Profile"}
              </h2>
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={handleClose} aria-label="Close" />
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
            <TextInput
              label="Profile Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Home WireGuard"
              required
              fullWidth
            />

            <div>
              <p className="mb-2 text-sm font-medium text-nd-text-secondary">Protocol</p>
              <div className="flex gap-2" role="radiogroup" aria-label="VPN protocol">
                {(["wireguard", "openvpn"] as const).map((p) => (
                  <button
                    key={p}
                    role="radio"
                    aria-checked={protocol === p}
                    onClick={() => setProtocol(p)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      protocol === p
                        ? "bg-nd-accent-primary/20 text-nd-accent-primary"
                        : "border border-nd-border-subtle text-nd-text-muted hover:text-nd-text-primary"
                    }`}
                  >
                    {p === "wireguard" ? "WireGuard" : "OpenVPN"}
                  </button>
                ))}
              </div>
            </div>

            <TextInput
              label="Endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={protocol === "wireguard" ? "vpn.example.com:51820" : "vpn.example.com:1194"}
              required
              fullWidth
            />

            {/* Private key with reveal toggle */}
            <div className="nd-field w-full">
              <label htmlFor="nd-private-key" className="nd-field__label">
                Private Key
              </label>
              <div className="relative">
                <input
                  id="nd-private-key"
                  type={showKey ? "text" : "password"}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Base64-encoded private key…"
                  className="nd-input w-full pr-20"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-nd-text-muted transition hover:text-nd-text-primary"
                  aria-label={showKey ? "Hide private key" : "Reveal private key"}
                >
                  {showKey ? "Hide" : "Reveal"}
                </button>
              </div>
            </div>

            {protocol === "openvpn" && (
              <TextInput
                label="CA Certificate Path (optional)"
                placeholder="/etc/openvpn/ca.crt"
                fullWidth
              />
            )}

            <Toggle
              checked={autoConnect}
              onChange={() => setAutoConnect((v) => !v)}
              label="Auto-connect on launch"
            />

            <div className="flex items-start gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3 text-xs text-nd-text-muted">
              <Shield
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-nd-accent-primary"
                aria-hidden
              />
              <p>
                Private keys are stored encrypted in the OS keychain and never transmitted in
                plaintext over IPC.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-nd-border-subtle p-4">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSave()}
                loading={saving}
                disabled={!name.trim() || !endpoint.trim()}
              >
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      </FocusTrapContainer>

      <ConfirmDialog
        open={showDiscard}
        title="Discard Changes"
        message="You have unsaved changes. Discard them and close?"
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setShowDiscard(false);
          onClose();
        }}
        onCancel={() => setShowDiscard(false)}
      />
    </div>
  );
}

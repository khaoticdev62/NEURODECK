import { useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { Modal } from "../../components/primitives/Modal";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { Skeleton } from "../../components/primitives/Skeleton";
import { TextInput } from "../../components/primitives/TextInput";
import { Tooltip } from "../../components/primitives/Tooltip";
import { useToast } from "../../components/primitives/Toast";
import { bridgeInvoke, neurodeckApi } from "../../services/bridgeAdapter";
import type { CredentialStatus, NeuroDeckAction, NeuroDeckState } from "../../types/neurodeck";

type ProviderId = "gemini" | "huggingface" | "openai_compat";

interface KeyRecord {
  provider: ProviderId;
  label: string;
  addedAt: string | null;
  value: string | null;
}

const PROVIDERS: ProviderId[] = ["gemini", "huggingface", "openai_compat"];

const PROVIDER_META: Record<ProviderId, { name: string; defaultLabel: string }> = {
  gemini: { name: "Gemini", defaultLabel: "Gemini API Key" },
  huggingface: { name: "HuggingFace", defaultLabel: "HuggingFace Token" },
  openai_compat: { name: "OpenAI-compatible", defaultLabel: "OpenAI-compatible Key" },
};

const MASKED_VALUE = "•".repeat(24);

export function ApiKeyVaultView({
  state: _state,
  dispatch: _dispatch,
}: {
  state?: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
}) {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "idle">("loading");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null);
  const [formProvider, setFormProvider] = useState<ProviderId>("gemini");
  const [formKey, setFormKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<ProviderId, string | undefined>>({
    gemini: undefined,
    huggingface: undefined,
    openai_compat: undefined,
  });
  const [confirmReveal, setConfirmReveal] = useState<ProviderId | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProviderId | null>(null);
  const revealTimers = useRef<Record<ProviderId, number | undefined>>({
    gemini: undefined,
    huggingface: undefined,
    openai_compat: undefined,
  });
  const { toast } = useToast();

  const buildKeys = (credentialStatus: CredentialStatus): KeyRecord[] => {
    return PROVIDERS.map((provider) => ({
      provider,
      label: PROVIDER_META[provider].defaultLabel,
      addedAt: credentialStatus[provider] ? new Date().toISOString() : null,
      value: credentialStatus[provider] ? "" : null,
    }));
  };

  const loadKeys = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const credentialStatus = await neurodeckApi.diagnostics.getCredentialStatus();
      setKeys(buildKeys(credentialStatus));
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadKeys();
    const timers = revealTimers.current;
    return () => {
      PROVIDERS.forEach((provider) => {
        if (timers[provider]) {
          window.clearTimeout(timers[provider]);
        }
      });
    };
  }, [loadKeys]);

  const handleReveal = async (provider: ProviderId) => {
    if (provider !== "gemini") return;
    try {
      const value = await bridgeInvoke<string>("get_gemini_api_key");
      setRevealed((prev) => ({ ...prev, [provider]: value }));
      if (revealTimers.current[provider]) {
        window.clearTimeout(revealTimers.current[provider]);
      }
      revealTimers.current[provider] = window.setTimeout(() => {
        setRevealed((prev) => ({ ...prev, [provider]: undefined }));
      }, 10000);
      toast("Key revealed — it will hide in 10 seconds", "info", 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to reveal key", "error", 4000);
    } finally {
      setConfirmReveal(null);
    }
  };

  const handleCopy = async (provider: ProviderId) => {
    let value = revealed[provider];
    if (provider === "gemini" && !value) {
      try {
        value = await bridgeInvoke<string>("get_gemini_api_key");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to copy key", "error", 4000);
        return;
      }
    }
    if (!value) {
      toast("Key value unavailable", "error", 3000);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast("Copied to clipboard", "success", 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to copy", "error", 4000);
    }
  };

  const handleDelete = async (provider: ProviderId) => {
    try {
      if (provider === "gemini") {
        await bridgeInvoke("delete_gemini_api_key");
      }
      setKeys((prev) =>
        prev.map((key) =>
          key.provider === provider ? { ...key, value: null, addedAt: null } : key
        )
      );
      toast(`${PROVIDER_META[provider].name} key removed`, "info", 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete key", "error", 4000);
    } finally {
      setConfirmDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingProvider(null);
    setFormProvider("gemini");
    setFormKey("");
    setFormLabel("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (provider: ProviderId) => {
    const key = keys.find((k) => k.provider === provider);
    setEditingProvider(provider);
    setFormProvider(provider);
    setFormKey(key?.value ?? "");
    setFormLabel(key?.label ?? PROVIDER_META[provider].defaultLabel);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const key = formKey.trim();
    if (!key) {
      setFormError("API key is required");
      return;
    }
    setSaving(true);
    try {
      if (formProvider === "gemini") {
        await bridgeInvoke("save_gemini_api_key", { key });
      }
      setKeys((prev) =>
        prev.map((k) =>
          k.provider === formProvider
            ? {
                ...k,
                label: formLabel.trim() || PROVIDER_META[formProvider].defaultLabel,
                value: "",
                addedAt: new Date().toISOString(),
              }
            : k
        )
      );
      toast(editingProvider ? "Key updated" : "Key saved to vault", "success", 3000);
      setModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value: string | null): string => {
    if (!value) return "Unknown";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const modalTitle = editingProvider
    ? `Edit ${PROVIDER_META[editingProvider].name} Key`
    : "Add API Key";

  return (
    <Panel
      eyebrow="Security"
      title="API Key Vault"
      scrollable
      action={
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={openAddModal}
          disabled={status === "loading"}
          className="min-h-touch"
        >
          Add Key
        </Button>
      }
    >
      <div className="flex h-full flex-col gap-4 p-4">
        {error && (
          <ErrorState
            title="Failed to load vault"
            message={error}
            onRetry={() => void loadKeys()}
            onClose={() => setError(null)}
          />
        )}

        <div className="flex items-start gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2.5">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent-success"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-nd-text-secondary">
            Keys are stored in your OS keychain (not in config files).
          </p>
        </div>

        {status === "loading" && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" count={3} delay={0} />
          </div>
        )}

        {status === "idle" && keys.every((k) => !k.addedAt) && (
          <EmptyState
            icon={KeyRound}
            title="No API keys saved"
            description="Keys are stored securely in your OS keychain."
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={openAddModal}
                className="min-h-touch"
              >
                Add Key
              </Button>
            }
          />
        )}

        {status === "idle" && keys.some((k) => k.addedAt) && (
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
              {keys
                .filter((k) => k.addedAt)
                .map((key) => {
                  const revealedValue = revealed[key.provider];
                  const canReveal = key.provider === "gemini";
                  const canCopy = key.provider === "gemini";
                  return (
                    <div
                      key={key.provider}
                      className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <KeyRound
                              className="h-3.5 w-3.5 text-nd-accent-primary"
                              aria-hidden="true"
                            />
                            <h4 className="text-xs font-semibold text-nd-text-primary">
                              {key.label || PROVIDER_META[key.provider].defaultLabel}
                            </h4>
                          </div>
                          <p className="mt-1 text-2xs text-nd-text-muted">
                            Provider: {PROVIDER_META[key.provider].name} · Added:{" "}
                            {formatDate(key.addedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {canReveal ? (
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label={`Reveal ${key.label}`}
                              aria-pressed={!!revealedValue}
                              onClick={() => setConfirmReveal(key.provider)}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                          ) : (
                            <Tooltip label="Reveal not supported">
                              <span>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Reveal ${key.label} (not supported)`}
                                  disabled
                                >
                                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {canCopy ? (
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label={`Copy ${key.label}`}
                              onClick={() => void handleCopy(key.provider)}
                            >
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                          ) : (
                            <Tooltip label="Copy not supported">
                              <span>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Copy ${key.label} (not supported)`}
                                  disabled
                                >
                                  <Copy className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${key.label}`}
                            onClick={() => openEditModal(key.provider)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${key.label}`}
                            onClick={() => setConfirmDelete(key.provider)}
                          >
                            <Trash2 className="h-4 w-4 text-nd-accent-error" aria-hidden="true" />
                          </IconButton>
                        </div>
                      </div>
                      <div className="mt-3">
                        <input
                          type={revealedValue ? "text" : "password"}
                          readOnly
                          value={revealedValue || MASKED_VALUE}
                          className="w-full rounded-lg border border-nd-border-subtle bg-nd-surface-base px-3 py-2 font-mono text-xs text-nd-text-primary focus:outline-none focus:ring-1 focus:ring-nd-accent-primary"
                          aria-label={
                            revealedValue ? `Revealed ${key.label}` : `Masked ${key.label}`
                          }
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
          description="Enter the API key and an optional label."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                onClick={() => void handleSave()}
              >
                Save
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {!editingProvider && (
              <Select
                label="Provider"
                value={formProvider}
                onChange={(e) => setFormProvider(e.target.value as ProviderId)}
                options={PROVIDERS.map((p) => ({ value: p, label: PROVIDER_META[p].name }))}
                fullWidth
              />
            )}
            <TextInput
              label="Label"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder={PROVIDER_META[formProvider].defaultLabel}
              fullWidth
            />
            <TextInput
              label="API Key"
              type="password"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              error={formError ?? undefined}
              required
              fullWidth
            />
          </div>
        </Modal>

        <ConfirmDialog
          open={!!confirmReveal}
          onCancel={() => setConfirmReveal(null)}
          onConfirm={() => {
            if (confirmReveal) void handleReveal(confirmReveal);
          }}
          title="Reveal key?"
          message="It will auto-hide after 10 seconds."
          confirmLabel="Reveal"
          cancelLabel="Cancel"
        />

        <ConfirmDialog
          open={!!confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete) void handleDelete(confirmDelete);
          }}
          title={`Delete ${confirmDelete ? PROVIDER_META[confirmDelete].name : ""} key?`}
          message="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
        />
      </div>
    </Panel>
  );
}

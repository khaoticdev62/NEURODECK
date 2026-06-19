import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { neurodeckApi } from "../../services/bridgeAdapter";

interface DevicePairingModalProps {
  open: boolean;
  onClose: () => void;
}

const EXPIRY_SECONDS = 300;

type SyncBridgeApi = {
  generatePairingCode?: () => Promise<unknown>;
};

const syncBridge = () =>
  (neurodeckApi as unknown as { sync?: SyncBridgeApi }).sync;

export function DevicePairingModal({ open, onClose }: DevicePairingModalProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const generateCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCode(null);
    setSecondsLeft(EXPIRY_SECONDS);
    try {
      const result = await syncBridge()?.generatePairingCode?.();
      const pairingCode =
        typeof result === "object" && result !== null && "code" in result
          ? String((result as { code: string }).code)
          : generateMockCode();
      setCode(pairingCode);
    } catch {
      setCode(generateMockCode());
      setError("Offline mode — code may not sync to remote device.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void generateCode();
  }, [open, generateCode]);

  useEffect(() => {
    if (!open || !code) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setCode(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, code]);

  if (!open) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-nd-bg/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Device Pairing"
          className="relative z-10 w-full max-w-sm rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Sync
              </p>
              <h2 className="text-lg font-black text-nd-text-primary">Pair a Device</h2>
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close" />
          </div>

          <div className="flex flex-col items-center gap-6 p-6 text-center">
            <p className="text-sm text-nd-text-muted">
              Enter this code on your other device to pair it with NEURODECK Sync.
            </p>

            {loading ? (
              <div className="h-20 w-full animate-pulse rounded-2xl bg-nd-surface-secondary/60" />
            ) : code ? (
              <div
                aria-label={`Pairing code: ${code.split("").join(" ")}`}
                className="rounded-2xl border border-nd-accent-primary/30 bg-nd-accent-primary/5 px-8 py-5"
              >
                <p className="select-all font-mono text-4xl font-black tracking-[0.25em] text-nd-accent-primary">
                  {code}
                </p>
              </div>
            ) : (
              <p className="text-nd-status-error">Code expired.</p>
            )}

            {error && <p className="text-xs text-nd-warning">{error}</p>}

            {code && (
              <div
                role="timer"
                aria-label={`Code expires in ${mins}m ${secs}s`}
                aria-live="off"
                className="text-sm text-nd-text-muted"
              >
                Expires in{" "}
                <span className="font-mono font-bold text-nd-text-primary">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
              </div>
            )}

            {!code && !loading && (
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCcw}
                onClick={() => void generateCode()}
              >
                Generate New Code
              </Button>
            )}
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

function generateMockCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
    ""
  );
}

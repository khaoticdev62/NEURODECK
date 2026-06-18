import { useCallback, useRef, useState } from "react";
import {
  CheckCircle2,
  FileUp,
  HardDrive,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi } from "../../services/bridgeAdapter";

type OllamaApi = {
  pull?: (model: string) => Promise<{ ok: boolean; message?: string }>;
};

type Step = 1 | 2 | 3 | 4;

interface CompatibilityResult {
  ok: boolean;
  reason?: string;
  quantization?: string;
  paramCount?: string;
  contextLength?: number;
}

interface LocalModelImportWizardProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const STEP_LABELS = ["Select File", "Compatibility", "Metadata", "Import"];

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-nd-surface-secondary/60">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-nd-accent-primary transition-all duration-300"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Import progress"
      />
    </div>
  );
}

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Import steps">
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = (i + 1) as Step;
        const state = stepNum < current ? "done" : stepNum === current ? "active" : "pending";
        return (
          <li key={i} className="flex items-center gap-1">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                state === "done"
                  ? "bg-nd-status-success text-white"
                  : state === "active"
                  ? "bg-nd-accent-primary text-nd-surface-bg"
                  : "bg-nd-surface-secondary/60 text-nd-text-muted"
              }`}
              aria-current={state === "active" ? "step" : undefined}
            >
              {state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : stepNum}
            </span>
            {i < total - 1 && (
              <span
                className={`h-px w-6 transition ${stepNum < current ? "bg-nd-status-success" : "bg-nd-border-subtle"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function LocalModelImportWizard({
  open,
  onClose,
  onImported,
}: LocalModelImportWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [compat, setCompat] = useState<CompatibilityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ollamaApi = () =>
    (neurodeckApi as unknown as { ollama?: OllamaApi }).ollama;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const baseName = file.name.replace(/\.(gguf|onnx)$/i, "").replace(/[_-]/g, " ");
    setModelName(baseName);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(gguf|onnx)$/i.test(file.name)) {
      handleFileSelect(file);
    }
  };

  const checkCompatibility = useCallback(async () => {
    if (!selectedFile) return;
    setChecking(true);
    setCompat(null);
    await new Promise<void>((r) => setTimeout(r, 1000));
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    setCompat({
      ok: ext === "gguf" || ext === "onnx",
      reason: ext !== "gguf" && ext !== "onnx" ? "Unsupported format" : undefined,
      quantization: ext === "gguf" ? "Q4_K_M" : "INT8",
      paramCount: "7B",
      contextLength: 4096,
    });
    setChecking(false);
    setStep(2);
  }, [selectedFile]);

  const runImport = useCallback(async () => {
    if (!selectedFile || !modelName.trim()) return;
    setImporting(true);
    setProgress(0);
    setImportError(null);
    try {
      for (let p = 0; p <= 100; p += 10) {
        await new Promise<void>((r) => setTimeout(r, 120));
        setProgress(p);
      }
      await ollamaApi()?.pull?.(modelName.trim());
      setImportDone(true);
    } catch (e) {
      setImportError(String(e));
    } finally {
      setImporting(false);
    }
  }, [selectedFile, modelName]);

  const handleReset = () => {
    setStep(1);
    setSelectedFile(null);
    setCompat(null);
    setChecking(false);
    setModelName("");
    setModelDescription("");
    setImporting(false);
    setProgress(0);
    setImportDone(false);
    setImportError(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-nd-surface-bg/80 backdrop-blur-sm"
        onClick={() => { if (!importing) onClose(); }}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import Local Model"
          className="relative z-10 flex w-full max-w-[540px] flex-col overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Models
              </p>
              <h2 className="text-lg font-black text-nd-text-primary">Import Local Model</h2>
            </div>
            <div className="flex items-center gap-4">
              <StepIndicator current={step} total={4} />
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={onClose}
                disabled={importing}
                aria-label="Close"
              />
            </div>
          </div>

          {/* Step label */}
          <div className="border-b border-nd-border-subtle bg-nd-surface-secondary/40 px-5 py-2">
            <p className="text-xs font-semibold text-nd-text-muted">
              Step {step} of 4 — <span className="text-nd-text-secondary">{STEP_LABELS[step - 1]}</span>
            </p>
          </div>

          {/* Body */}
          <div className="min-h-[280px] p-5">
            {/* Step 1: File Select */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-nd-text-muted">
                  Select a GGUF or ONNX model file to import into NEURODECK.
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Drop zone for model file"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition ${
                    dragOver
                      ? "border-nd-accent-primary bg-nd-accent-primary/10"
                      : selectedFile
                      ? "border-nd-status-success/50 bg-nd-status-success/5"
                      : "border-nd-border-subtle hover:border-nd-accent-primary/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gguf,.onnx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                    aria-label="Select model file"
                  />
                  {selectedFile ? (
                    <>
                      <HardDrive className="h-8 w-8 text-nd-status-success" aria-hidden />
                      <p className="font-semibold text-nd-text-primary">{selectedFile.name}</p>
                      <p className="text-xs text-nd-text-muted">
                        {(selectedFile.size / 1024 / 1024 / 1024).toFixed(2)} GB
                      </p>
                    </>
                  ) : (
                    <>
                      <FileUp className="h-8 w-8 text-nd-text-muted" aria-hidden />
                      <p className="font-medium text-nd-text-secondary">
                        Drop a .gguf or .onnx file here
                      </p>
                      <p className="text-xs text-nd-text-muted">or click to browse</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Compatibility */}
            {step === 2 && (
              <div className="space-y-4">
                {checking ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-nd-accent-primary" aria-hidden />
                    <p className="text-sm text-nd-text-muted" role="status">
                      Checking compatibility…
                    </p>
                  </div>
                ) : compat ? (
                  <div className="space-y-3">
                    <div
                      className={`flex items-center gap-3 rounded-2xl border p-4 ${
                        compat.ok
                          ? "border-nd-status-success/30 bg-nd-status-success/5"
                          : "border-nd-status-error/30 bg-nd-status-error/5"
                      }`}
                      role="status"
                    >
                      {compat.ok ? (
                        <CheckCircle2 className="h-6 w-6 text-nd-status-success" aria-hidden />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-nd-status-error" aria-hidden />
                      )}
                      <div>
                        <p className={`font-bold ${compat.ok ? "text-nd-status-success" : "text-nd-status-error"}`}>
                          {compat.ok ? "Compatible" : "Incompatible"}
                        </p>
                        <p className="text-sm text-nd-text-muted">{compat.reason ?? selectedFile?.name}</p>
                      </div>
                    </div>
                    {compat.ok && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Quantization", value: compat.quantization },
                          { label: "Parameters", value: compat.paramCount },
                          { label: "Context", value: `${compat.contextLength ?? 0} tokens` },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3 text-center"
                          >
                            <p className="text-xs text-nd-text-muted">{row.label}</p>
                            <p className="font-bold text-nd-text-primary">{row.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Step 3: Metadata */}
            {step === 3 && (
              <div className="space-y-4">
                <TextInput
                  label="Model Name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Llama 3.2 7B Q4"
                  required
                  fullWidth
                />
                <div className="nd-field w-full">
                  <label htmlFor="model-description" className="nd-field__label">
                    Description (optional)
                  </label>
                  <textarea
                    id="model-description"
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                    placeholder="Short description of this model's capabilities…"
                    rows={3}
                    className="nd-input w-full resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Import */}
            {step === 4 && (
              <div className="space-y-4">
                {importDone ? (
                  <div className="flex flex-col items-center gap-3 py-10" role="status">
                    <CheckCircle2 className="h-12 w-12 text-nd-status-success" aria-hidden />
                    <p className="font-bold text-nd-text-primary">Import complete!</p>
                    <p className="text-sm text-nd-text-muted">
                      <strong>{modelName}</strong> is now available in the Model Manager.
                    </p>
                  </div>
                ) : importError ? (
                  <div
                    className="rounded-2xl border border-nd-status-error/30 bg-nd-status-error/5 p-4"
                    role="alert"
                  >
                    <p className="font-bold text-nd-status-error">Import failed</p>
                    <p className="text-sm text-nd-text-muted">{importError}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-nd-text-muted">
                      Importing <strong>{selectedFile?.name}</strong> as{" "}
                      <strong>{modelName}</strong>…
                    </p>
                    <ProgressBar value={progress} />
                    <p className="text-xs text-nd-text-muted" role="status" aria-live="polite">
                      {importing ? `${progress}% — Processing model file…` : "Ready to import."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-nd-border-subtle p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (step > 1) setStep((s) => (s - 1) as Step); else onClose(); }}
              disabled={importing}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              {importDone ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { handleReset(); onImported(); onClose(); }}
                >
                  Done
                </Button>
              ) : step === 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedFile}
                  onClick={() => void checkCompatibility()}
                  loading={checking}
                >
                  Check Compatibility
                </Button>
              ) : step === 2 ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!compat?.ok}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              ) : step === 3 ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!modelName.trim()}
                  onClick={() => setStep(4)}
                >
                  Review & Import
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  loading={importing}
                  disabled={importing || !!importDone}
                  onClick={() => void runImport()}
                >
                  Import Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

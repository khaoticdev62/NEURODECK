import { useState } from "react";
import { Webhook, Send, Copy, Plus, Trash2 } from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { ApiResponse } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { Select } from "../../components/primitives/Select";
import { TextInput } from "../../components/primitives/TextInput";
import { Badge } from "../../components/primitives/Badge";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "../../components/primitives/Tabs";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const METHOD_OPTIONS = METHODS.map((m) => ({ value: m, label: m }));

export function ApiLabView() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: "Content-Type", value: "application/json" },
  ]);
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"headers" | "body" | "response">("response");

  const send = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key) headerObj[h.key] = h.value;
      });
      const res = await neurodeckApi.apiLab.sendRequest({
        method,
        url: url.trim(),
        headers: headerObj,
        body: body.trim() || undefined,
      });
      setResponse(res);
      setActiveTab("response");
    } catch (e) {
      setError(String(e));
      setResponse(null);
    }
    setLoading(false);
  };

  const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);
  const updateHeader = (i: number, key: string, value: string) => {
    const next = [...headers];
    next[i] = { key, value };
    setHeaders(next);
  };
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i));

  const responseTone = response
    ? response.status >= 200 && response.status < 300
      ? "success"
      : response.status >= 400
        ? "danger"
        : "warning"
    : "neutral";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Webhook className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            API Lab
          </p>
          <h2 className="text-lg font-semibold text-nd-text-primary">HTTP Request Builder</h2>
          <p className="text-xs text-nd-text-muted">
            Send requests, inspect headers, and capture responses.
          </p>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <Select
          aria-label="HTTP method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={METHOD_OPTIONS}
          className="w-28 shrink-0"
        />
        <TextInput
          aria-label="Request URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="https://api.example.com/v1/resource"
          fullWidth
        />
        <Button variant="success" loading={loading} onClick={send} icon={Send}>
          Send
        </Button>
      </div>

      <TabGroup
        value={activeTab}
        onChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabList aria-label="Request sections" className="mb-3">
          {(["headers", "body", "response"] as const).map((tab) => (
            <Tab key={tab} value={tab}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Tab>
          ))}
        </TabList>

        <TabPanels className="min-h-0 flex-1 overflow-hidden">
          <TabPanel value="headers" className="h-full">
            <div className="space-y-2 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary p-4">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput
                    aria-label={`Header ${i + 1} name`}
                    value={h.key}
                    onChange={(e) => updateHeader(i, e.target.value, h.value)}
                    placeholder="Header"
                    fullWidth
                  />
                  <TextInput
                    aria-label={`Header ${i + 1} value`}
                    value={h.value}
                    onChange={(e) => updateHeader(i, h.key, e.target.value)}
                    placeholder="Value"
                    fullWidth
                  />
                  <IconButton
                    aria-label="Remove header"
                    variant="subtle"
                    onClick={() => removeHeader(i)}
                  >
                    <Trash2 className="h-4 w-4 text-nd-accent-error" aria-hidden="true" />
                  </IconButton>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addHeader} icon={Plus}>
                Add header
              </Button>
            </div>
          </TabPanel>

          <TabPanel value="body" className="h-full">
            <div className="flex h-full flex-col gap-2">
              <label htmlFor="api-body" className="text-xs font-medium text-nd-text-muted">
                Request body
              </label>
              <textarea
                id="api-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder='{"key": "value"}'
                className="min-h-0 min-h-touch flex-1 resize-none rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary p-4 font-mono text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
              />
            </div>
          </TabPanel>

          <TabPanel value="response" className="h-full">
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary p-4">
              {error && (
                <ErrorState
                  title="Request failed"
                  message={error}
                  onRetry={send}
                  onClose={() => setError(null)}
                />
              )}
              {response ? (
                <>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={responseTone} variant="fill">
                      {response.status} {response.statusText}
                    </Badge>
                    <IconButton
                      aria-label="Copy response"
                      variant="subtle"
                      onClick={() => navigator.clipboard.writeText(response.body)}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                  <pre aria-live="polite" role="region" aria-label="Response body" className="min-h-0 flex-1 overflow-auto rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3 font-mono text-xs text-nd-text-secondary">
                    {response.body}
                  </pre>
                </>
              ) : (
                !error && (
                  <EmptyState
                    icon={Send}
                    title="No response yet"
                    description="Configure your request and press Send to see the response here."
                    className="h-full"
                  />
                )
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}

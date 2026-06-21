import { useEffect, useMemo, useRef, useState } from "react";
import { Network, RefreshCw, Cpu, Database, FolderOpen, Layers, Zap, Server } from "lucide-react";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { LoadingState } from "../../components/primitives/LoadingState";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import {
  neurodeckApi,
  type DashboardStats,
  type Project,
  type ProviderHealth,
  type PluginInfo,
} from "../../services/bridgeAdapter";

type GraphNodeType = "core" | "category" | "leaf";

interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  x: number;
  y: number;
  colorClass: string;
  detail: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  dashboard: DashboardStats | null;
  projects: Project[];
  health: ProviderHealth[];
  workflows: { name: string }[];
  plugins: { plugins: PluginInfo[]; count: number; enabled: number } | null;
  error: string | null;
  loading: boolean;
}

const W = 800;
// H has headroom beyond R_LEAF's reach (250) plus the +14px label offset below
// a leaf node, so labels on leaves pointing straight down never clip the
// viewBox's own bottom edge.
const H = 560;
const CX = W / 2;
const CY = H / 2;
const R_CATEGORY = 130;
const R_LEAF = 250;

const CATEGORIES: { key: string; label: string; colorClass: string; icon: typeof Network }[] = [
  { key: "sessions", label: "Sessions", colorClass: "text-nd-accent-primary", icon: Network },
  { key: "memory", label: "Memory", colorClass: "text-nd-accent-success", icon: Database },
  { key: "projects", label: "Projects", colorClass: "text-nd-accent-warning", icon: FolderOpen },
  { key: "models", label: "Models", colorClass: "text-nd-accent-info", icon: Cpu },
  { key: "workflows", label: "Workflows", colorClass: "text-nd-accent-agent", icon: Zap },
  { key: "plugins", label: "Plugins", colorClass: "text-nd-accent-success", icon: Server },
];

function truncate(text: string, max = 18) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function buildGraph(data: GraphData): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const dashboard = data.dashboard;
  const coreDetail = dashboard
    ? `${dashboard.sessions_total} sessions · ${dashboard.memory_total} memories · ${formatBytes(dashboard.db_size_bytes)}`
    : "System intelligence graph";

  nodes.push({
    id: "core",
    type: "core",
    label: "NeuroDeck",
    x: CX,
    y: CY,
    colorClass: "text-nd-accent-primary",
    detail: coreDetail,
  });

  const n = CATEGORIES.length;
  CATEGORIES.forEach((cat, i) => {
    const angle = i * ((2 * Math.PI) / n) - Math.PI / 2;
    const cx = CX + R_CATEGORY * Math.cos(angle);
    const cy = CY + R_CATEGORY * Math.sin(angle);

    let count = 0;
    const leaves: { id: string; label: string; detail: string }[] = [];

    switch (cat.key) {
      case "sessions": {
        const sessions = dashboard?.recent_sessions ?? [];
        count = dashboard?.sessions_total ?? 0;
        sessions.slice(0, 8).forEach((s) => {
          leaves.push({
            id: `sess-${s.id}`,
            label: truncate(s.name || s.id),
            detail: `${s.message_count} message(s)`,
          });
        });
        break;
      }
      case "memory": {
        count = dashboard?.memory_total ?? 0;
        const pb = dashboard?.privacy_breakdown;
        if (pb) {
          if (pb.standard > 0)
            leaves.push({
              id: "mem-standard",
              label: "Standard",
              detail: `${pb.standard} records`,
            });
          if (pb.private > 0)
            leaves.push({ id: "mem-private", label: "Private", detail: `${pb.private} records` });
          if (pb.sensitive > 0)
            leaves.push({
              id: "mem-sensitive",
              label: "Sensitive",
              detail: `${pb.sensitive} records`,
            });
          if (pb.sealed > 0)
            leaves.push({ id: "mem-sealed", label: "Sealed", detail: `${pb.sealed} records` });
        }
        if ((dashboard?.memory_pinned ?? 0) > 0) {
          leaves.push({
            id: "mem-pinned",
            label: "Pinned",
            detail: `${dashboard!.memory_pinned} records`,
          });
        }
        break;
      }
      case "projects": {
        const projs = data.projects?.slice(0, 10) ?? [];
        count = data.projects.length;
        projs.forEach((p) => {
          leaves.push({
            id: `proj-${p.id}`,
            label: truncate(p.name),
            detail: p.description ? truncate(p.description, 30) : "Project",
          });
        });
        break;
      }
      case "models": {
        const runtimes = data.health?.slice(0, 4) ?? [];
        count = runtimes.length;
        runtimes.forEach((h) => {
          const runtimeId = `model-rt-${h.runtime_id}`;
          leaves.push({
            id: runtimeId,
            label: truncate(h.label || h.runtime_id, 16),
            detail: `${h.state} · ${h.models?.length ?? 0} model(s)`,
          });
          h.models?.slice(0, 4).forEach((m) => {
            leaves.push({
              id: `model-m-${h.runtime_id}-${m}`,
              label: truncate(m, 16),
              detail: "Model",
            });
          });
        });
        break;
      }
      case "workflows": {
        const wfs = data.workflows?.slice(0, 10) ?? [];
        count = data.workflows.length;
        wfs.forEach((w) => {
          leaves.push({ id: `wf-${w.name}`, label: truncate(w.name), detail: "Workflow" });
        });
        break;
      }
      case "plugins": {
        const plugs = data.plugins?.plugins?.slice(0, 10) ?? [];
        count = data.plugins?.count ?? 0;
        plugs.forEach((p) => {
          leaves.push({
            id: `plug-${p.name}`,
            label: truncate(p.name),
            detail: `v${p.version ?? "?"} · ${p.enabled ? "enabled" : "disabled"}`,
          });
        });
        break;
      }
    }

    nodes.push({
      id: `cat-${cat.key}`,
      type: "category",
      label: cat.label,
      x: cx,
      y: cy,
      colorClass: cat.colorClass,
      detail: `${count} item(s)`,
    });
    edges.push({ source: "core", target: `cat-${cat.key}` });

    const spread = ((2 * Math.PI) / n) * 0.75;
    leaves.forEach((leaf, j) => {
      const leafAngle = angle - spread / 2 + (j + 1) * (spread / (leaves.length + 1));
      const lx = CX + R_LEAF * Math.cos(leafAngle);
      const ly = CY + R_LEAF * Math.sin(leafAngle);
      nodes.push({
        id: leaf.id,
        type: "leaf",
        label: leaf.label,
        x: lx,
        y: ly,
        colorClass: cat.colorClass,
        detail: leaf.detail,
      });
      edges.push({ source: `cat-${cat.key}`, target: leaf.id });
    });
  });

  return { nodes, edges };
}

export function GraphView() {
  const [data, setData] = useState<GraphData>({
    dashboard: null,
    projects: [],
    health: [],
    workflows: [],
    plugins: null,
    error: null,
    loading: true,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    detail: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    detail: "",
  });
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());

  const load = async () => {
    setData((d) => ({ ...d, loading: true, error: null }));
    const [dashboardRes, projectsRes, healthRes, workflowsRes, pluginsRes] =
      await Promise.allSettled([
        neurodeckApi.dashboard.stats().catch(() => null),
        neurodeckApi.projects.list().catch(() => []),
        neurodeckApi.models.getProviderHealth().catch(() => []),
        neurodeckApi.workflow.list().catch(() => []),
        neurodeckApi.plugins.list().catch(() => null),
      ]);

    const dashboard = dashboardRes.status === "fulfilled" ? dashboardRes.value : null;
    const projects = (projectsRes.status === "fulfilled" ? projectsRes.value : null) ?? [];
    const health = (healthRes.status === "fulfilled" ? healthRes.value : null) ?? [];
    const workflows = (workflowsRes.status === "fulfilled" ? workflowsRes.value : null) ?? [];
    const plugins = pluginsRes.status === "fulfilled" ? pluginsRes.value : null;

    const errors: string[] = [];
    if (dashboardRes.status === "rejected") errors.push("dashboard");
    if (projectsRes.status === "rejected") errors.push("projects");
    if (healthRes.status === "rejected") errors.push("models");
    if (workflowsRes.status === "rejected") errors.push("workflows");
    if (pluginsRes.status === "rejected") errors.push("plugins");

    setData({
      dashboard,
      projects,
      health,
      workflows,
      plugins,
      error: errors.length > 0 ? `Could not load: ${errors.join(", ")}` : null,
      loading: false,
    });
  };

  useEffect(() => {
    load();
  }, []);

  const { nodes, edges } = useMemo(() => buildGraph(data), [data]);
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const handleNodeEnter = (node: GraphNode) => {
    setHovered(node.id);
    setTooltip((t) => ({ ...t, visible: true, title: node.label, detail: node.detail }));
  };

  const handleNodeMove = (e: React.MouseEvent<SVGSVGElement>) => {
    setTooltip((t) => ({ ...t, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));
  };

  const handleNodeLeave = () => {
    setHovered(null);
    if (focusedNodeId) {
      const node = nodeMap.get(focusedNodeId);
      if (node) {
        setTooltip((t) => ({ ...t, visible: true, title: node.label, detail: node.detail }));
      }
    } else {
      setTooltip((t) => ({ ...t, visible: false }));
    }
  };

  const handleNodeFocus = (node: GraphNode) => {
    setFocusedNodeId(node.id);
    setTooltip((t) => ({ ...t, visible: true, title: node.label, detail: node.detail }));
  };

  const handleNodeBlur = () => {
    setFocusedNodeId(null);
    setTooltip((t) => ({ ...t, visible: false }));
  };

  const focusNodeByIndex = (idx: number) => {
    const node = nodes[idx];
    if (!node) return;
    const el = nodeRefs.current.get(node.id);
    el?.focus();
  };

  const handleNodeKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusNodeByIndex((idx + 1) % nodes.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusNodeByIndex((idx - 1 + nodes.length) % nodes.length);
    }
  };

  const nodeRadius = (type: GraphNodeType) => {
    switch (type) {
      case "core":
        return 24;
      case "category":
        return 14;
      default:
        return 7;
    }
  };

  const dashboard = data.dashboard;

  return (
    <Panel
      eyebrow="Intelligence"
      title="System Graph"
      className="flex h-full flex-col overflow-hidden"
      action={
        <IconButton
          variant="subtle"
          size="md"
          aria-label="Refresh graph"
          onClick={load}
          disabled={data.loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${data.loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </IconButton>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        {data.error && (
          <ErrorState title="Graph load failed" message={data.error} onRetry={() => void load()} />
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Sessions"
            value={dashboard?.sessions_total ?? 0}
            icon={Network}
            hint="Total sessions"
          />
          <MetricCard
            label="Memory"
            value={dashboard?.memory_total ?? 0}
            icon={Database}
            hint="Stored records"
          />
          <MetricCard
            label="Projects"
            value={dashboard?.projects_total ?? 0}
            icon={FolderOpen}
            hint="Knowledge spaces"
          />
          <MetricCard
            label="Models"
            value={data.health.length}
            icon={Cpu}
            hint="Provider runtimes"
          />
          <MetricCard
            label="Workflows"
            value={data.workflows.length}
            icon={Layers}
            hint="Automation flows"
          />
          <MetricCard
            label="Plugins"
            value={data.plugins?.count ?? 0}
            icon={Server}
            hint="Registered plugins"
          />
        </div>

        <div className="relative min-h-0 flex-1 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30">
          {data.loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-nd-surface-secondary/40">
              <LoadingState label="Loading graph…" />
            </div>
          )}

          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full cursor-crosshair"
            role="group"
            aria-label="System intelligence graph"
            onMouseMove={handleNodeMove}
            onMouseLeave={handleNodeLeave}
          >
            <defs>
              <filter id="graph-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {edges.map((e) => {
              const s = nodeMap.get(e.source);
              const t = nodeMap.get(e.target);
              if (!s || !t) return null;
              const activeId = hovered || focusedNodeId;
              const dim = activeId && activeId !== s.id && activeId !== t.id;
              return (
                <line
                  key={`${e.source}-${e.target}`}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  className={`stroke-nd-text-muted/20 transition-opacity duration-fast ${dim ? "opacity-20" : "opacity-100"}`}
                  strokeWidth={1}
                />
              );
            })}

            {nodes.map((n, idx) => {
              const r = nodeRadius(n.type);
              const isHovered = hovered === n.id;
              const isFocused = focusedNodeId === n.id;
              const activeId = hovered || focusedNodeId;
              const dim =
                activeId &&
                activeId !== n.id &&
                !edges.some(
                  (e) =>
                    (e.source === activeId && e.target === n.id) ||
                    (e.target === activeId && e.source === n.id)
                );
              const showLabel = n.type !== "leaf" || isHovered || isFocused;
              return (
                <g
                  key={n.id}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(n.id, el);
                    else nodeRefs.current.delete(n.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.label}: ${n.detail}`}
                  className={`${n.colorClass} cursor-pointer transition-opacity duration-fast focus:outline-none ${dim ? "opacity-30" : "opacity-100"}`}
                  onMouseEnter={() => handleNodeEnter(n)}
                  onFocus={() => handleNodeFocus(n)}
                  onBlur={handleNodeBlur}
                  onKeyDown={(e) => handleNodeKeyDown(e, idx)}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isHovered || isFocused ? r + 3 : r}
                    fill="currentColor"
                    className={
                      n.type === "core"
                        ? "opacity-30"
                        : n.type === "category"
                          ? "opacity-50"
                          : "opacity-90"
                    }
                    filter="url(#graph-glow)"
                  />
                  {isFocused && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r + 6}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="opacity-80"
                      pointerEvents="none"
                    />
                  )}
                  {n.type === "core" && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r - 8}
                      fill="currentColor"
                      className="opacity-90"
                    />
                  )}
                  {showLabel && (
                    <text
                      x={n.x}
                      y={n.y + r + 14}
                      textAnchor="middle"
                      className="fill-nd-text-secondary text-[11px] select-none"
                      dominantBaseline="middle"
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {focusedNodeId
              ? `${nodeMap.get(focusedNodeId)?.label}: ${nodeMap.get(focusedNodeId)?.detail}`
              : ""}
          </div>

          {(tooltip.visible || focusedNodeId) && (
            <div
              className="pointer-events-none absolute z-20 max-w-[16rem] rounded-lg border border-nd-border-subtle bg-nd-surface-secondary px-3 py-2 shadow-nd-elevation-card"
              style={{
                left: (focusedNodeId ? nodeMap.get(focusedNodeId)?.x ?? tooltip.x : tooltip.x) + 12,
                top: (focusedNodeId ? nodeMap.get(focusedNodeId)?.y ?? tooltip.y : tooltip.y) + 12,
              }}
            >
              <div className="text-xs font-semibold text-nd-text-primary">
                {focusedNodeId ? nodeMap.get(focusedNodeId)?.label : tooltip.title}
              </div>
              {focusedNodeId ? (
                nodeMap.get(focusedNodeId)?.detail ? (
                  <div className="mt-0.5 text-2xs text-nd-text-secondary">
                    {nodeMap.get(focusedNodeId)?.detail}
                  </div>
                ) : null
              ) : tooltip.detail ? (
                <div className="mt-0.5 text-2xs text-nd-text-secondary">{tooltip.detail}</div>
              ) : null}
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-1.5 rounded-full border border-nd-border-subtle bg-nd-surface-secondary/80 px-2 py-1"
              >
                <span className={`h-2 w-2 rounded-full ${c.colorClass.replace("text-", "bg-")}`} />
                <span className="text-2xs text-nd-text-secondary">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Network } from "lucide-react";
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
const H = 520;
const CX = W / 2;
const CY = H / 2;
const R_CATEGORY = 130;
const R_LEAF = 250;

const CATEGORIES: { key: string; label: string; colorClass: string }[] = [
  { key: "sessions", label: "Sessions", colorClass: "text-nd-accent" },
  { key: "memory", label: "Memory", colorClass: "text-nd-success" },
  { key: "projects", label: "Projects", colorClass: "text-nd-warning" },
  { key: "models", label: "Models", colorClass: "text-nd-text-info" },
  { key: "workflows", label: "Workflows", colorClass: "text-nd-accent-tertiary" },
  { key: "plugins", label: "Plugins", colorClass: "text-nd-text-code" },
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
    colorClass: "text-nd-accent",
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
          if (pb.standard > 0) leaves.push({ id: "mem-standard", label: "Standard", detail: `${pb.standard} records` });
          if (pb.private > 0) leaves.push({ id: "mem-private", label: "Private", detail: `${pb.private} records` });
          if (pb.sensitive > 0) leaves.push({ id: "mem-sensitive", label: "Sensitive", detail: `${pb.sensitive} records` });
          if (pb.sealed > 0) leaves.push({ id: "mem-sealed", label: "Sealed", detail: `${pb.sealed} records` });
        }
        if ((dashboard?.memory_pinned ?? 0) > 0) {
          leaves.push({ id: "mem-pinned", label: "Pinned", detail: `${dashboard!.memory_pinned} records` });
        }
        break;
      }
      case "projects": {
        const projs = data.projects.slice(0, 10);
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
        const runtimes = data.health.slice(0, 4);
        count = runtimes.length;
        runtimes.forEach((h) => {
          const runtimeId = `model-rt-${h.runtime_id}`;
          leaves.push({
            id: runtimeId,
            label: truncate(h.label || h.runtime_id, 16),
            detail: `${h.state} · ${h.models.length} model(s)`,
          });
          h.models.slice(0, 4).forEach((m) => {
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
        const wfs = data.workflows.slice(0, 10);
        count = data.workflows.length;
        wfs.forEach((w) => {
          leaves.push({ id: `wf-${w.name}`, label: truncate(w.name), detail: "Workflow" });
        });
        break;
      }
      case "plugins": {
        const plugs = data.plugins?.plugins.slice(0, 10) ?? [];
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
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; title: string; detail: string }>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    detail: "",
  });

  const load = async () => {
    setData((d) => ({ ...d, loading: true, error: null }));
    const [dashboardRes, projectsRes, healthRes, workflowsRes, pluginsRes] = await Promise.allSettled([
      neurodeckApi.dashboard.stats().catch(() => null),
      neurodeckApi.projects.list().catch(() => []),
      neurodeckApi.models.getProviderHealth().catch(() => []),
      neurodeckApi.workflow.list().catch(() => []),
      neurodeckApi.plugins.list().catch(() => null),
    ]);

    const dashboard = dashboardRes.status === "fulfilled" ? dashboardRes.value : null;
    const projects = projectsRes.status === "fulfilled" ? projectsRes.value : [];
    const health = healthRes.status === "fulfilled" ? healthRes.value : [];
    const workflows = workflowsRes.status === "fulfilled" ? workflowsRes.value : [];
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
    setTooltip((t) => ({ ...t, visible: false }));
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Network className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-nd-text">Graph</h2>
          <p className="text-xs text-nd-text-muted">Live relationship graph of sessions, memory, models, projects, workflows, and plugins</p>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
        {data.loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-nd-accent/30 border-t-nd-accent" />
          </div>
        )}

        {data.error && !data.loading && (
          <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between rounded-xl border border-nd-accent-error/30 bg-nd-surface-danger/10 px-4 py-2 text-xs text-nd-text-danger">
            <span>{data.error}</span>
            <button
              type="button"
              onClick={load}
              className="ml-3 rounded-md bg-nd-surface/60 px-2 py-1 text-nd-text-secondary hover:bg-nd-surface hover:text-nd-text"
            >
              Retry
            </button>
          </div>
        )}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full cursor-crosshair"
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
            const dim = hovered && hovered !== s.id && hovered !== t.id;
            return (
              <line
                key={`${e.source}-${e.target}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                className={`stroke-nd-text-muted/20 transition-opacity ${dim ? "opacity-20" : "opacity-100"}`}
                strokeWidth={1}
              />
            );
          })}

          {nodes.map((n) => {
            const r = nodeRadius(n.type);
            const isHovered = hovered === n.id;
            const dim = hovered && hovered !== n.id && !edges.some((e) => (e.source === hovered && e.target === n.id) || (e.target === hovered && e.source === n.id));
            const showLabel = n.type !== "leaf" || isHovered;
            return (
              <g
                key={n.id}
                className={`${n.colorClass} transition-opacity ${dim ? "opacity-30" : "opacity-100"}`}
                onMouseEnter={() => handleNodeEnter(n)}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isHovered ? r + 3 : r}
                  fill="currentColor"
                  className={n.type === "core" ? "opacity-30" : n.type === "category" ? "opacity-25" : "opacity-80"}
                  filter={n.type === "core" || n.type === "category" ? "url(#graph-glow)" : undefined}
                />
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
                    className="fill-nd-text-secondary text-[9px] select-none"
                    dominantBaseline="middle"
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-20 max-w-[16rem] rounded-lg border border-nd-border-subtle bg-nd-surface-tooltip px-3 py-2 shadow-lg"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <div className="text-xs font-semibold text-nd-text-primary">{tooltip.title}</div>
            {tooltip.detail && <div className="mt-0.5 text-[10px] text-nd-text-muted">{tooltip.detail}</div>}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 rounded-full border border-nd-border-subtle bg-nd-surface/70 px-2 py-1">
              <span className={`h-2 w-2 rounded-full ${c.colorClass.replace("text-", "bg-")}`} />
              <span className="text-[10px] text-nd-text-muted">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

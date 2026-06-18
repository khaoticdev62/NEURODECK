import { bridgeInvoke } from "../http";

export type WorkflowDoc = {
  name: string;
  nodes: Array<{ id: string; type: string; config?: Record<string, unknown> }>;
  edges: Array<{ id: string; from: string; fromPort?: string; to: string }>;
};

export type WorkflowSummary = { name: string };

export const workflow = {
  async list(): Promise<WorkflowSummary[]> {
    const res = await bridgeInvoke<{ workflows: string[] }>("list_workflows");
    return (res.workflows ?? []).map((name) => ({ name }));
  },
  async load(name: string): Promise<WorkflowDoc> {
    const res = await bridgeInvoke<{ name: string; json: string }>("load_workflow", { name });
    return JSON.parse(typeof res.json === "string" ? res.json : "{}") as WorkflowDoc;
  },
  async save(name: string, doc: WorkflowDoc): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("save_workflow", {
      name,
      json: JSON.stringify(doc),
    });
  },
  async delete(name: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("delete_workflow", { name });
  },
  async run(name: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("workflow_run", { name });
  },
  async importJson(json: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("workflow_import", { json });
  },
  async export(name: string): Promise<{ name: string; ndwf: string }> {
    return bridgeInvoke<{ name: string; ndwf: string }>("workflow_export", { name });
  },
};

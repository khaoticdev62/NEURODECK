import type { ProjectScanResult, ProjectContextSnapshot } from "../../../types/neurodeck";
import { bridgeInvoke } from "../http";
import type { MemoryRecord } from "./memory";

export type ProjectScanResponse =
  | { canceled: true }
  | { canceled: false; project?: ProjectScanResult; error?: string };

export type ProjectContextResponse =
  | { ok: true; context: ProjectContextSnapshot }
  | { ok: false; error: string };

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export const projects = {
  async selectAndScan(): Promise<ProjectScanResponse> {
    try {
      const result = await bridgeInvoke<ProjectScanResult>("scan_project");
      return { canceled: false, project: result };
    } catch (e) {
      return { canceled: false, error: String(e) };
    }
  },
  async buildContext(projectPath: string): Promise<ProjectContextResponse> {
    try {
      const context = await bridgeInvoke<ProjectContextSnapshot>("build_project_context", {
        path: projectPath,
      });
      return { ok: true, context };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async list(): Promise<Project[]> {
    return bridgeInvoke<Project[]>("list_projects");
  },
  async getMemory(id: string): Promise<MemoryRecord[]> {
    return bridgeInvoke<MemoryRecord[]>("get_project_memory", { id });
  },
};

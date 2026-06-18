import { bridgeInvoke } from "../http";

export interface PromptSlot {
  id: string;
  label: string;
  required: boolean;
  kind: "text" | "textarea" | "select" | "file" | "multi";
  default?: string;
  options?: string[];
  suggestions?: string[];
}

export interface PromptTemplate {
  id: string;
  pack_id: string;
  title: string;
  description: string;
  category: string;
  agent_hint: string;
  slots: PromptSlot[];
  template: string;
  risk_level: string;
  intent?: string;
  role?: string;
  autocomplete_terms?: string[];
  requires_confirmation?: boolean;
}

export interface PromptPack {
  id: string;
  title: string;
  description: string;
  templates?: PromptTemplate[];
}

export interface PromptPreview {
  valid: boolean;
  missing_slots: string[];
  errors: string[];
  rendered_prompt: string | null;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  template_id?: string;
  pack_id?: string;
  slot_values?: Record<string, string>;
}

export interface MacroStep {
  kind: string;
  timestamp: string;
  payload: Record<string, unknown>;
  requires_confirmation?: boolean;
}

export interface MacroDefinition {
  id: string;
  name: string;
  created_at: string;
  steps: MacroStep[];
  risk_level: string;
}

export interface Suggestion {
  id: string;
  label: string;
  source: string;
  insert_text: string;
  score: number;
}

export const promptDrive = {
  async listPacks() {
    return bridgeInvoke<PromptPack[]>("promptdrive_list_packs");
  },
  async listTemplates(packId?: string) {
    return bridgeInvoke<PromptTemplate[]>("promptdrive_list_templates", { pack_id: packId });
  },
  async getTemplate(templateId: string) {
    return bridgeInvoke<PromptTemplate>("promptdrive_get_template", { template_id: templateId });
  },
  async previewPrompt(templateId: string, slotValues: Record<string, string>) {
    return bridgeInvoke<PromptPreview>("promptdrive_preview_prompt", {
      template_id: templateId,
      slot_values: slotValues,
    });
  },
  async executePrompt(templateId: string, slotValues: Record<string, string>, prompt: string) {
    return bridgeInvoke<{ status: string; validation?: PromptPreview }>(
      "promptdrive_execute_prompt",
      {
        template_id: templateId,
        slot_values: slotValues,
        prompt,
      }
    );
  },
  async savePrompt(payload: {
    title: string;
    template_id?: string;
    pack_id?: string;
    slot_values: Record<string, string>;
    prompt: string;
  }) {
    return bridgeInvoke<SavedPrompt>("promptdrive_save_prompt", payload);
  },
  async listSavedPrompts() {
    return bridgeInvoke<SavedPrompt[]>("promptdrive_list_saved_prompts");
  },
  async macroStart() {
    return bridgeInvoke<{ recording_id: string; status: string }>("promptdrive_macro_start");
  },
  async macroStop(recordingId: string, name: string, steps: MacroStep[]) {
    return bridgeInvoke<MacroDefinition>("promptdrive_macro_stop", {
      recording_id: recordingId,
      name,
      steps,
    });
  },
  async macroExecute(macroId: string) {
    return bridgeInvoke<{ status: string; safe_replay: boolean; macro: MacroDefinition }>(
      "promptdrive_macro_execute",
      { macro_id: macroId }
    );
  },
  async listMacros() {
    return bridgeInvoke<MacroDefinition[]>("promptdrive_list_macros");
  },
  async deleteMacro(macroId: string) {
    return bridgeInvoke<{ status: string; macro_id: string }>("promptdrive_delete_macro", {
      macro_id: macroId,
    });
  },
  async getSuggestions(query: string, templateId?: string, slotId?: string) {
    return bridgeInvoke<Suggestion[]>("promptdrive_get_suggestions", {
      query,
      template_id: templateId,
      slot_id: slotId,
    });
  },
};

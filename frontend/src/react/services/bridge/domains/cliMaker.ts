import type { CliCommandDef } from "../../../types/neurodeck";
import { bridgeInvoke } from "../http";

export const cliMaker = {
  async list(): Promise<CliCommandDef[]> {
    return bridgeInvoke<CliCommandDef[]>("cli_list_commands");
  },
  async create(def: CliCommandDef): Promise<{ id: string }> {
    return bridgeInvoke<{ id: string }>("cli_create_command", { def: JSON.stringify(def) });
  },
  async update(id: string, def: CliCommandDef): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("cli_update_command", { id, def: JSON.stringify(def) });
  },
  async delete(id: string): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("cli_delete_command", { id });
  },
  async run(id: string, args: string = ""): Promise<{ output: string }> {
    return bridgeInvoke<{ output: string }>("cli_run_command", { id, args });
  },
  async exportLua(id: string): Promise<{ lua: string }> {
    return bridgeInvoke<{ lua: string }>("cli_export_lua", { id });
  },
  async saveAsPlugin(id: string): Promise<{ path: string }> {
    return bridgeInvoke<{ path: string }>("cli_maker_save_plugin", { id });
  },
  async exportScript(id: string, format: string): Promise<{ path: string }> {
    return bridgeInvoke<{ path: string }>("cli_maker_export", { id, format });
  },
  async importLua(path: string): Promise<CliCommandDef[]> {
    return bridgeInvoke<CliCommandDef[]>("cli_import_lua", { path });
  },
};

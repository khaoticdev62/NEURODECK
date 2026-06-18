import { bridgeInvoke } from "../http";
import type {
  FileTransfer,
  SyncProfile,
  TransferDiagnostics,
  TransferPeer,
  TrustedPeer,
} from "../types/transfer";

const SYNC_PROFILES_STORAGE_KEY = "neurodeck:sync_profiles_fallback";

function isBridgeCommandMissing(error: unknown, command: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Command '${command}' not found in bridge dispatch table`);
}

function readLocalSyncProfiles(): SyncProfile[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SYNC_PROFILES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SyncProfile[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSyncProfiles(profiles: SyncProfile[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SYNC_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

function applyLocalSyncProfileAction(
  action: "list" | "add" | "update" | "remove",
  profile?: Partial<SyncProfile> & { id?: string }
): { status: string; profiles?: SyncProfile[]; profile?: SyncProfile } {
  const profiles = readLocalSyncProfiles();
  if (action === "list") return { status: "ok", profiles };

  if (action === "remove") {
    const id = profile?.id;
    if (!id) return { status: "error", profiles };
    const next = profiles.filter((p) => p.id !== id);
    writeLocalSyncProfiles(next);
    return { status: "ok", profiles: next };
  }

  const now = new Date().toISOString();
  const id = profile?.id || `sync-profile-${Date.now()}`;
  const existing = profiles.find((p) => p.id === id);
  const nextProfile: SyncProfile = {
    id,
    name: profile?.name || existing?.name || "Sync Profile",
    mode: profile?.mode || existing?.mode || "lan",
    enabled: profile?.enabled ?? existing?.enabled ?? true,
    preferred_interface: profile?.preferred_interface || existing?.preferred_interface || "auto",
    incoming_folder: profile?.incoming_folder || existing?.incoming_folder || "",
    auto_accept_trusted: profile?.auto_accept_trusted ?? existing?.auto_accept_trusted ?? false,
    compression: profile?.compression || existing?.compression || "auto",
    vpn_only: profile?.vpn_only ?? existing?.vpn_only ?? false,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  const next = profiles.filter((p) => p.id !== id);
  next.push(nextProfile);
  writeLocalSyncProfiles(next);
  return { status: "ok", profile: nextProfile, profiles: next };
}

export const transfer = {
  async listPeers(): Promise<TransferPeer[]> {
    return bridgeInvoke<TransferPeer[]>("get_discovered_peers");
  },
  async listActive(): Promise<FileTransfer[]> {
    return bridgeInvoke<FileTransfer[]>("get_active_transfers");
  },
  async sendFile(peer_ip: string, file_path: string) {
    return bridgeInvoke<{ status: string; transfer_id: string }>("start_file_transfer", {
      peer_ip,
      file_path,
    });
  },
  async respond(transfer_id: string, accept: boolean) {
    return bridgeInvoke<{ status: string }>("respond_to_transfer", { transfer_id, accept });
  },
  async cancel(id: string) {
    return bridgeInvoke<{ status: string }>("transfer_cancel", { id });
  },
  async retry(transfer_id: string) {
    return bridgeInvoke<{ status: string; new_transfer_id: string }>("transfer_retry", {
      transfer_id,
    });
  },
  async groupCode(action: "get" | "set" | "clear", code?: string) {
    return bridgeInvoke<{ status: string; code?: string; has_code?: boolean }>(
      "transfer_group_code",
      { action, code }
    );
  },
  async addManualPeer(ip: string, port: number, hostname: string) {
    return bridgeInvoke<{ status: string; peer_ip: string }>("transfer_manual_add_peer", {
      ip,
      port,
      hostname,
    });
  },
  async trustedPeers(action: "list" | "add" | "remove", ip?: string, label?: string) {
    return bridgeInvoke<{ status: string; peers?: TrustedPeer[] }>("transfer_trusted_peers", {
      action,
      ip,
      label,
    });
  },
  async profiles(
    action: "list" | "add" | "update" | "remove",
    profile?: Partial<SyncProfile> & { id?: string }
  ) {
    try {
      return await bridgeInvoke<{
        status: string;
        profiles?: SyncProfile[];
        profile?: SyncProfile;
      }>("transfer_profiles", {
        action,
        profile,
      });
    } catch (e) {
      if (isBridgeCommandMissing(e, "transfer_profiles")) {
        return applyLocalSyncProfileAction(action, profile);
      }
      throw e;
    }
  },
  async diagnostics() {
    return bridgeInvoke<{ status: string; diagnostics: TransferDiagnostics }>(
      "transfer_diagnostics"
    );
  },
  async clearHistory(include_active?: boolean) {
    return bridgeInvoke<{ status: string; cleared: number }>("transfer_clear_history", {
      include_active,
    });
  },
  async getInboxPath() {
    return bridgeInvoke<{ status: string; path: string }>("transfer_get_inbox_path");
  },
};

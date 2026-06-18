import { bridgeInvoke } from "../http";
import type { DiscoveredPeer, FileTransfer } from "../types/transfer";

export const share = {
  async getPeers() {
    return bridgeInvoke<DiscoveredPeer[]>("get_discovered_peers");
  },
  async getActiveTransfers() {
    return bridgeInvoke<FileTransfer[]>("get_active_transfers");
  },
  async startTransfer(filePath: string, peerId?: string) {
    return bridgeInvoke<{ success: boolean; transfer_id?: string }>("start_file_transfer", {
      file_path: filePath,
      peer_id: peerId,
    });
  },
  async cancelTransfer(id: string) {
    return bridgeInvoke<{ status: string }>("transfer_cancel", { id });
  },
  async respondToTransfer(transferId: string, accept: boolean) {
    return bridgeInvoke<{ status: string }>("respond_to_transfer", {
      transfer_id: transferId,
      accept,
    });
  },
  async getGroupCode() {
    return bridgeInvoke<{ code: string }>("get_group_code");
  },
  async setGroupCode(code: string) {
    return bridgeInvoke<{ status: string; code: string }>("set_group_code", { code });
  },
};

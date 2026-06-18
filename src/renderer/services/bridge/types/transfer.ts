/**
 * Canonical peer/transfer types shared by the Transfer and Share domains.
 */

export interface TransferPeer {
  ip: string;
  hostname: string;
  os: string;
  port: number;
  is_warpinator: boolean;
}

export type DiscoveredPeer = TransferPeer;

export interface FileTransfer {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status:
    | "Pending"
    | "Accepted"
    | "Rejected"
    | "Transferring"
    | "Completed"
    | "Failed"
    | "Cancelled";
  direction: "Incoming" | "Outgoing";
  peer_ip: string;
  peer_name: string;
}

export interface TrustedPeer {
  ip: string;
  label: string;
  group_code_hash: string;
  added_at: string;
}

export interface SyncProfile {
  id: string;
  name: string;
  mode: "lan" | "vpn_manual" | "vpn_mesh" | "hybrid" | "receive_only" | "send_only";
  enabled: boolean;
  preferred_interface: string;
  incoming_folder: string;
  auto_accept_trusted: boolean;
  compression: "auto" | "off";
  vpn_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransferDiagnostics {
  mdns_active: boolean;
  peer_count: number;
  active_transfers: number;
  tcp_port: number;
  grpc_port: number;
  group_code_set: boolean;
  download_dir: string;
}

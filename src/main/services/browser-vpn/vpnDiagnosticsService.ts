import { vpnRouteManager } from "./vpnRouteManager";
import type { VpnDiagnosticsReport } from "../../../shared/browser-vpn/vpnDiagnosticsTypes";

export class VpnDiagnosticsService {
  getReport(profileId?: string): VpnDiagnosticsReport {
    return vpnRouteManager.getStatus(profileId);
  }
}

export const vpnDiagnosticsService = new VpnDiagnosticsService();

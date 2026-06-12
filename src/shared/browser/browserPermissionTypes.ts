export type { BrowserPermissionDecision, BrowserPermissionState } from "./browserContracts";

export type PermissionRequestPayload = {
  requestId: string;
  origin: string;
  permission: string;
  tabId: string;
};

export type PermissionResponsePayload = {
  requestId: string;
  decision: import("./browserContracts").BrowserPermissionDecision;
};

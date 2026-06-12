import * as fs from "fs";
import * as path from "path";
import type { BrowserPermissionState, BrowserPermissionDecision } from "../../../shared/browser/browserContracts";
import { browserProfileService } from "./browserProfileService";

export class BrowserPermissionService {
  private permissionsPath: string;
  private decisions: BrowserPermissionState[] = [];
  private pendingCallbacks: Map<string, (allowed: boolean) => void> = new Map();

  constructor() {
    try {
      const { app } = require("electron");
      this.permissionsPath = path.join(app.getPath("userData"), "browser-permissions.json");
    } catch {
      this.permissionsPath = path.join(process.cwd(), "browser-permissions-test.json");
    }
    this.loadDecisions();
  }

  private loadDecisions() {
    try {
      if (fs.existsSync(this.permissionsPath)) {
        this.decisions = JSON.parse(fs.readFileSync(this.permissionsPath, "utf-8"));
      }
    } catch (_) {
      this.decisions = [];
    }
  }

  private saveDecisions() {
    try {
      fs.writeFileSync(this.permissionsPath, JSON.stringify(this.decisions, null, 2), "utf-8");
    } catch (_) {}
  }

  getDecisions(): BrowserPermissionState[] {
    return this.decisions;
  }

  getDecision(origin: string, permission: string, profileId: string): BrowserPermissionDecision | null {
    const entry = this.decisions.find(
      (d) => d.origin === origin && d.permission === permission && d.profileId === profileId
    );
    return entry ? entry.decision : null;
  }

  saveDecision(origin: string, permission: string, profileId: string, decision: BrowserPermissionDecision) {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return;

    // Remove existing
    this.decisions = this.decisions.filter(
      (d) => !(d.origin === origin && d.permission === permission && d.profileId === profileId)
    );

    const newDecision: BrowserPermissionState = {
      origin,
      permission,
      decision,
      profileId,
      createdAt: new Date().toISOString(),
    };

    // Only persist if profile is persistent and decision is always
    if (profile.persistent && (decision === "allow_always" || decision === "block_always")) {
      this.decisions.push(newDecision);
      this.saveDecisions();
    }
  }

  registerRequest(requestId: string, callback: (allowed: boolean) => void) {
    this.pendingCallbacks.set(requestId, callback);
  }

  resolveRequest(requestId: string, decision: BrowserPermissionDecision) {
    const callback = this.pendingCallbacks.get(requestId);
    if (callback) {
      const allowed = decision === "allow_once" || decision === "allow_always";
      callback(allowed);
      this.pendingCallbacks.delete(requestId);
    }
  }
}

export const browserPermissionService = new BrowserPermissionService();

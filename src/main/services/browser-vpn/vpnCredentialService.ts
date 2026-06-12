import * as fs from "fs";
import * as path from "path";

type CredentialEntry = {
  profileId: string;
  secretType: string;
  ciphertext: string;
  storedAt: string;
};

export class VpnCredentialService {
  private storePath: string;
  private entries: CredentialEntry[] = [];

  constructor() {
    try {
      const { app } = require("electron");
      this.storePath = path.join(app.getPath("userData"), "browser-vpn-credentials.json");
    } catch {
      this.storePath = path.join(process.cwd(), "browser-vpn-credentials.test.json");
    }
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.storePath)) {
        this.entries = JSON.parse(fs.readFileSync(this.storePath, "utf-8")) as CredentialEntry[];
      }
    } catch (err) {
      console.error("[vpn] failed to load credential store:", err);
      this.entries = [];
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
      fs.writeFileSync(this.storePath, JSON.stringify(this.entries, null, 2), "utf-8");
    } catch (err) {
      console.error("[vpn] failed to save credential store:", err);
    }
  }

  private encrypt(secret: string): string {
    const { safeStorage } = require("electron");
    if (!safeStorage || typeof safeStorage.encryptString !== "function") {
      throw new Error("secure_storage_unavailable");
    }
    return safeStorage.encryptString(secret).toString("base64");
  }

  private decrypt(ciphertext: string): string {
    const { safeStorage } = require("electron");
    if (!safeStorage || typeof safeStorage.decryptString !== "function") {
      throw new Error("secure_storage_unavailable");
    }
    return safeStorage.decryptString(Buffer.from(ciphertext, "base64"));
  }

  saveSecret(profileId: string, secretType: string, secret: string): { ok: boolean; error?: string } {
    try {
      const ciphertext = this.encrypt(secret);
      this.entries = this.entries.filter((entry) => !(entry.profileId === profileId && entry.secretType === secretType));
      this.entries.push({ profileId, secretType, ciphertext, storedAt: new Date().toISOString() });
      this.save();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  getSecret(profileId: string, secretType: string): { ok: boolean; secret?: string; error?: string } {
    try {
      const entry = this.entries.find((item) => item.profileId === profileId && item.secretType === secretType);
      if (!entry) return { ok: false, error: "secret_not_found" };
      return { ok: true, secret: this.decrypt(entry.ciphertext) };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  deleteSecrets(profileId: string): void {
    this.entries = this.entries.filter((entry) => entry.profileId !== profileId);
    this.save();
  }
}

export const vpnCredentialService = new VpnCredentialService();

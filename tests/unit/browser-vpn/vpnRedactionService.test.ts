import { describe, expect, it } from "vitest";
import { vpnRedactionService } from "../../../src/main/services/browser-vpn/vpnRedactionService";

describe("vpnRedactionService", () => {
  it("redacts keys and passwords", () => {
    const redacted = vpnRedactionService.redactText(`PrivateKey = secret
password=secret
-----BEGIN CERTIFICATE-----
ABC
-----END CERTIFICATE-----`);
    expect(redacted).not.toContain("secret");
    expect(redacted).toContain("[REDACTED]");
  });
});


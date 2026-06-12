const REDACTION = "[REDACTED]";

function replaceAll(input: string, patterns: RegExp[]): string {
  let output = input;
  for (const pattern of patterns) {
    output = output.replace(pattern, REDACTION);
  }
  return output;
}

export class VpnRedactionService {
  redactText(input: string): string {
    if (typeof input !== "string" || !input) return "";
    return replaceAll(input, [
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
      /<key>[\s\S]*?<\/key>/gi,
      /<cert>[\s\S]*?<\/cert>/gi,
      /<tls-auth>[\s\S]*?<\/tls-auth>/gi,
      /<tls-crypt>[\s\S]*?<\/tls-crypt>/gi,
      /PrivateKey\s*=\s*.*$/gmi,
      /PresharedKey\s*=\s*.*$/gmi,
      /password\s*=\s*.*$/gmi,
      /username\s*=\s*.*$/gmi,
      /auth-user-pass(\s+.*)?$/gmi,
      /Bearer\s+[A-Za-z0-9._-]+/g,
      /AIza[0-9A-Za-z\-_]{20,}/g,
      /GOCSPX-[A-Za-z0-9_-]+/g,
    ]);
  }

  redactObject<T>(value: T): T {
    if (!value || typeof value !== "object") return value;
    return JSON.parse(this.redactText(JSON.stringify(value))) as T;
  }
}

export const vpnRedactionService = new VpnRedactionService();

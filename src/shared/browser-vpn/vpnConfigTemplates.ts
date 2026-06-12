export type VpnConfigTemplate = {
  id: string;
  label: string;
  routeMode: "browser_proxy" | "system_tunnel" | "external_verified" | "unsupported";
  protocol: string;
  description: string;
  configText: string;
};

export const VPN_CONFIG_TEMPLATES: VpnConfigTemplate[] = [
  {
    id: "openvpn-user-pass",
    label: "OpenVPN Username / Password",
    routeMode: "system_tunnel",
    protocol: "openvpn",
    description: "Standard OpenVPN client profile with auth-user-pass and redaction-safe defaults.",
    configText: `client
dev tun
proto udp
remote vpn.example.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun

remote-cert-tls server
auth-user-pass
auth-nocache

cipher AES-256-GCM
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
auth SHA256

verb 3

<ca>
-----BEGIN CERTIFICATE-----
PASTE_CA_CERTIFICATE_HERE
-----END CERTIFICATE-----
</ca>`,
  },
  {
    id: "wireguard-full-tunnel",
    label: "WireGuard Full Tunnel",
    routeMode: "system_tunnel",
    protocol: "wireguard",
    description: "Full-tunnel WireGuard profile with browser-safe defaults.",
    configText: `[Interface]
PrivateKey = PASTE_PRIVATE_KEY_HERE
Address = 10.8.0.2/32
DNS = 1.1.1.1, 9.9.9.9
MTU = 1420

[Peer]
PublicKey = PASTE_SERVER_PUBLIC_KEY_HERE
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`,
  },
  {
    id: "socks5-browser",
    label: "SOCKS5 Browser Proxy",
    routeMode: "browser_proxy",
    protocol: "socks5_proxy",
    description: "Browser-scoped SOCKS5 profile for privacy routing.",
    configText: `{
  "name": "Provider SOCKS5",
  "protocol": "socks5",
  "host": "proxy.example.com",
  "port": 1080,
  "username": "PASTE_USERNAME_IF_REQUIRED",
  "password": "PASTE_PASSWORD_IF_REQUIRED",
  "bypassRules": ["localhost", "127.0.0.1", "<local>"],
  "proxyDns": true
}`,
  },
  {
    id: "external-verified",
    label: "External Verified Mode",
    routeMode: "external_verified",
    protocol: "external",
    description: "Use when the VPN is connected outside NEURODECK and only verification is available.",
    configText: `# External verified mode
# Configure your provider client outside NEURODECK, then run verification here.`,
  },
];

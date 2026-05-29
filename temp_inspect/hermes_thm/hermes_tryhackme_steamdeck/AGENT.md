# Agent Notes: Hermes TryHackMe Steam Deck Extension

This package is a Lua extension and standalone installer for wiring TryHackMe into Steam Deck Game Mode.

Do not add credential storage. Do not automate TryHackMe login. Do not bypass MFA/CAPTCHA/paywalls. Do not scrape the TryHackMe website.

Primary file:

```txt
extensions/tryhackme_steamdeck.lua
```

Standalone command examples:

```bash
lua extensions/tryhackme_steamdeck.lua install
lua extensions/tryhackme_steamdeck.lua doctor
lua extensions/tryhackme_steamdeck.lua launch
lua extensions/tryhackme_steamdeck.lua vpn status
```

Generated user paths:

```txt
~/.local/bin/hermes-tryhackme-launch
~/.local/bin/hermes-thm-vpn
~/.local/share/applications/tryhackme-game-mode.desktop
~/.config/hermes-tryhackme/config.lua
~/.config/hermes-tryhackme/tryhackme.ovpn
~/.local/share/hermes-tryhackme/browser-profile
```

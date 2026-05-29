# Hermes TryHackMe Steam Deck Extension

A Hermes-compatible Lua extension that wires TryHackMe into Steam Deck Game Mode using a safe browser launcher, a persistent browser profile, an optional OpenVPN helper, and diagnostics.

## What this does

- Creates `~/.local/bin/hermes-tryhackme-launch`
- Creates `~/.local/bin/hermes-thm-vpn`
- Creates `~/.local/share/applications/tryhackme-game-mode.desktop`
- Creates `~/.config/hermes-tryhackme/config.lua`
- Creates a persistent browser profile at `~/.local/share/hermes-tryhackme/browser-profile`
- Supports Chrome, Chromium, Firefox, and Flatpak browser installs
- Lets you add the launcher to Steam as a Non-Steam Game, then launch it from Game Mode

## What this does not do

- It does not store your TryHackMe username or password.
- It does not bypass login, MFA, CAPTCHA, subscription controls, or platform restrictions.
- It does not download your TryHackMe VPN config for you.
- It does not modify Steam's binary shortcut database directly.
- It does not perform process injection.

## Install

Copy the Lua file somewhere on your Steam Deck, then run:

```bash
lua tryhackme_steamdeck.lua install
lua tryhackme_steamdeck.lua doctor
```

## Add to Steam Game Mode

1. Switch to Desktop Mode.
2. Open Steam.
3. Go to **Games > Add a Non-Steam Game to My Library**.
4. Browse to:

```txt
/home/deck/.local/bin/hermes-tryhackme-launch
```

5. Add it.
6. Rename it to `TryHackMe - Game Mode` if Steam does not use the desktop entry name.
7. Return to Game Mode.
8. Launch it and sign into TryHackMe inside the browser window.

## VPN setup

Download your TryHackMe OpenVPN config from your TryHackMe Access page and save it here:

```txt
/home/deck/.config/hermes-tryhackme/tryhackme.ovpn
```

Then run:

```bash
hermes-thm-vpn start
hermes-thm-vpn status
hermes-thm-vpn stop
```

The VPN helper uses `sudo openvpn`, so it may be better to start VPN from Desktop Mode before launching labs from Game Mode.

## Commands

```bash
lua tryhackme_steamdeck.lua install
lua tryhackme_steamdeck.lua wire
lua tryhackme_steamdeck.lua doctor
lua tryhackme_steamdeck.lua launch
lua tryhackme_steamdeck.lua vpn start
lua tryhackme_steamdeck.lua vpn stop
lua tryhackme_steamdeck.lua vpn status
lua tryhackme_steamdeck.lua vpn log
lua tryhackme_steamdeck.lua uninstall
lua tryhackme_steamdeck.lua uninstall --purge
```

## Hermes command names

When loaded into Hermes, this extension registers:

```txt
tryhackme.steamdeck.install
tryhackme.steamdeck.wire
tryhackme.steamdeck.doctor
tryhackme.steamdeck.launch
tryhackme.steamdeck.vpn
```

## Recommended Steam Input mapping

For browser use in Game Mode:

- Right trackpad: Mouse
- R2: Left click
- L2: Right click
- Left trackpad: Scroll wheel
- Steam + X: Keyboard
- Back buttons: Browser back/forward or Ctrl+L / Enter

## Security stance

This extension is for authorized TryHackMe learning labs only. It does not automate attacks, bypass controls, scrape credentials, or connect to any non-TryHackMe targets.

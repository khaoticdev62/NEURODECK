# Steam Deck Setup Notes

## Desktop Mode first

Steam Deck Game Mode is great for launching things, but adding non-Steam apps is normally done from Desktop Mode through Steam.

## Browser choice

Recommended order:

1. Google Chrome Flatpak
2. Chromium Flatpak
3. Firefox Flatpak
4. Native Chrome/Chromium/Firefox if present

The extension auto-detects these and creates a persistent profile so your TryHackMe session can stay signed in.

## VPN expectations

TryHackMe labs commonly use OpenVPN configs downloaded from the TryHackMe Access page. Put the `.ovpn` file at:

```txt
~/.config/hermes-tryhackme/tryhackme.ovpn
```

Then run:

```bash
~/.local/bin/hermes-thm-vpn start
```

Game Mode may not show sudo prompts cleanly. Start the VPN from Desktop Mode when needed.

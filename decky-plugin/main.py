"""
NeuroDeck Bridge — Decky Loader plugin backend.

Talks to NeuroDeck OS's real, loopback-only, token-authenticated control-plane
bridge (`src/core/decky/DeckyBridgeService.ts`) over plain HTTP. Standard
library only — no `requests` dependency, kept deliberately small since the
real work (auth, allowlisting, the actual actions) all lives on the
NeuroDeck side; this plugin is a thin, honest client.

Real error handling in both directions, per the supplemental spec's Decky
requirements: NeuroDeck must not hard-crash when this plugin is absent, and
this plugin must not crash when NeuroDeck is absent or the bridge is
disabled — every method here returns a plain {"available": False, "reason":
...} dict in that case instead of raising, so the frontend can render a real
"not connected" state rather than an error boundary.
"""

import json
import os
from http.client import HTTPConnection

import decky

DISCOVERY_FILENAME = "decky-bridge.json"

# NeuroDeck writes its discovery file to Electron's per-OS userData
# directory — on Linux/SteamOS that's ~/.config/<app-name>/. Adjust this
# list if the shipped Electron `app.getName()` value differs.
CANDIDATE_CONFIG_DIR_NAMES = ["neurodeck-os", "NeuroDeck OS"]


def _find_discovery_file():
    home = os.path.expanduser("~")
    for name in CANDIDATE_CONFIG_DIR_NAMES:
        path = os.path.join(home, ".config", name, DISCOVERY_FILENAME)
        if os.path.isfile(path):
            return path
    return None


def _read_discovery():
    path = _find_discovery_file()
    if not path:
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None
    if "port" not in data or "token" not in data:
        return None
    return data


def _request(method: str, path: str):
    discovery = _read_discovery()
    if not discovery:
        return {
            "available": False,
            "reason": "NeuroDeck is not running, or its Decky bridge is disabled.",
        }

    conn = HTTPConnection("127.0.0.1", discovery["port"], timeout=2)
    try:
        conn.request(
            method,
            path,
            headers={"Authorization": f"Bearer {discovery['token']}"},
        )
        response = conn.getresponse()
        raw = response.read()
        data = json.loads(raw) if raw else {}
        if response.status >= 400:
            return {
                "available": False,
                "reason": data.get("error", f"NeuroDeck returned HTTP {response.status}."),
            }
        return {"available": True, **data}
    except OSError as error:
        return {"available": False, "reason": str(error)}
    finally:
        conn.close()


class Plugin:
    async def get_status(self):
        return _request("GET", "/status")

    async def list_quick_actions(self):
        return _request("GET", "/quick-actions")

    async def focus_neurodeck(self):
        return _request("POST", "/focus")

    async def trigger_quick_action(self, action_id: str):
        return _request("POST", f"/quick-actions/{action_id}/trigger")

    async def _main(self):
        decky.logger.info("NeuroDeck Bridge plugin loaded.")

    async def _unload(self):
        decky.logger.info("NeuroDeck Bridge plugin unloaded.")

    async def _uninstall(self):
        pass

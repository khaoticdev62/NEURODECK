--[[
Hermes TryHackMe Steam Deck Extension
Version: 1.0.0
Purpose: Wire TryHackMe into Steam Deck Game Mode through a safe browser launcher,
         persistent browser profile, optional OpenVPN helper, and Hermes-compatible commands.

Important:
- This extension does NOT store TryHackMe credentials.
- This extension does NOT bypass login, captcha, MFA, paywalls, or TryHackMe controls.
- Sign-in happens inside the browser session created by the launcher.
- VPN use requires your own TryHackMe OpenVPN configuration file downloaded from your account.
- Designed for authorized TryHackMe learning labs only.

Standalone usage:
  lua tryhackme_steamdeck.lua install
  lua tryhackme_steamdeck.lua doctor
  lua tryhackme_steamdeck.lua launch
  lua tryhackme_steamdeck.lua vpn start
  lua tryhackme_steamdeck.lua vpn stop
  lua tryhackme_steamdeck.lua uninstall

Hermes usage:
  Drop this file into .hermes/plugins/tryhackme_steamdeck/plugin.lua or extensions/.
  The module returns an extension table with install/wire/doctor/uninstall hooks.
]]

local Extension = {
  id = "tryhackme.steamdeck",
  name = "TryHackMe Steam Deck Game Mode Extension",
  version = "1.0.0",
  description = "Creates a Game Mode-friendly TryHackMe launcher, persistent browser profile, optional VPN helper, and diagnostics.",
}

local sep = package.config:sub(1, 1)
local is_windows = sep == "\\"

local function trim(s)
  return tostring(s or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function home()
  return os.getenv("HOME") or os.getenv("USERPROFILE") or "."
end

local function expand(path)
  path = tostring(path or "")
  if path == "~" then return home() end
  if path:sub(1, 2) == "~/" then return home() .. path:sub(2) end
  return path
end

local function shell_quote(value)
  value = tostring(value or "")
  return "'" .. value:gsub("'", "'\\''") .. "'"
end

local function exists(path)
  path = expand(path)
  local f = io.open(path, "rb")
  if f then f:close(); return true end
  return false
end

local function read_file(path)
  local f = io.open(expand(path), "rb")
  if not f then return nil end
  local data = f:read("*a")
  f:close()
  return data
end

local function write_file(path, content)
  path = expand(path)
  local f, err = io.open(path, "wb")
  if not f then return false, err end
  f:write(content)
  f:close()
  return true
end

local function exec(cmd)
  return os.execute(cmd)
end

local function popen(cmd)
  local p = io.popen(cmd .. " 2>/dev/null")
  if not p then return "" end
  local out = p:read("*a") or ""
  p:close()
  return trim(out)
end

local function mkdir_p(path)
  path = expand(path)
  if is_windows then
    return exec('mkdir "' .. path .. '" >NUL 2>NUL')
  end
  return exec("mkdir -p " .. shell_quote(path))
end

local function chmod_x(path)
  if is_windows then return true end
  return exec("chmod +x " .. shell_quote(expand(path)))
end

local function command_exists(cmd)
  if is_windows then return false end
  local out = popen("command -v " .. shell_quote(cmd))
  return out ~= ""
end

local function flatpak_installed(app_id)
  if not command_exists("flatpak") then return false end
  local out = popen("flatpak info " .. shell_quote(app_id) .. " >/dev/null 2>&1; echo $?")
  return out == "0"
end

local default_config = {
  app_name = "TryHackMe",
  url = "https://tryhackme.com/dashboard",
  fallback_url = "https://tryhackme.com/login",
  install_dir = "~/.local/share/hermes-tryhackme",
  profile_dir = "~/.local/share/hermes-tryhackme/browser-profile",
  bin_dir = "~/.local/bin",
  config_dir = "~/.config/hermes-tryhackme",
  desktop_dir = "~/.local/share/applications",
  launcher_name = "hermes-tryhackme-launch",
  vpn_name = "hermes-thm-vpn",
  desktop_filename = "tryhackme-game-mode.desktop",
  ovpn_path = "~/.config/hermes-tryhackme/tryhackme.ovpn",
  browser = "auto", -- auto, chrome-flatpak, chromium-flatpak, firefox-flatpak, google-chrome, chromium, firefox
  kiosk = false,
  prefer_gamepad_browser_flags = true,
  vpn_enabled = true,
}

local function merge_config(user)
  local cfg = {}
  for k, v in pairs(default_config) do cfg[k] = v end
  if type(user) == "table" then
    for k, v in pairs(user) do cfg[k] = v end
  end
  return cfg
end

local function load_local_config()
  local path = expand("~/.config/hermes-tryhackme/config.lua")
  if not exists(path) then return {} end
  local fn, err = loadfile(path)
  if not fn then
    return { __config_error = err }
  end
  local ok, value = pcall(fn)
  if ok and type(value) == "table" then return value end
  return { __config_error = tostring(value) }
end

local function detect_browser(preference)
  preference = preference or "auto"

  local candidates = {
    ["chrome-flatpak"] = {
      id = "chrome-flatpak",
      label = "Google Chrome Flatpak",
      kind = "chromium",
      ok = function() return flatpak_installed("com.google.Chrome") end,
      command = "flatpak run com.google.Chrome",
    },
    ["chromium-flatpak"] = {
      id = "chromium-flatpak",
      label = "Chromium Flatpak",
      kind = "chromium",
      ok = function() return flatpak_installed("org.chromium.Chromium") end,
      command = "flatpak run org.chromium.Chromium",
    },
    ["firefox-flatpak"] = {
      id = "firefox-flatpak",
      label = "Firefox Flatpak",
      kind = "firefox",
      ok = function() return flatpak_installed("org.mozilla.firefox") end,
      command = "flatpak run org.mozilla.firefox",
    },
    ["google-chrome"] = {
      id = "google-chrome",
      label = "Google Chrome",
      kind = "chromium",
      ok = function() return command_exists("google-chrome") end,
      command = "google-chrome",
    },
    ["chromium"] = {
      id = "chromium",
      label = "Chromium",
      kind = "chromium",
      ok = function() return command_exists("chromium") or command_exists("chromium-browser") end,
      command = command_exists("chromium") and "chromium" or "chromium-browser",
    },
    ["firefox"] = {
      id = "firefox",
      label = "Firefox",
      kind = "firefox",
      ok = function() return command_exists("firefox") end,
      command = "firefox",
    },
  }

  if preference ~= "auto" and candidates[preference] and candidates[preference].ok() then
    return candidates[preference]
  end

  local order = {
    "chrome-flatpak",
    "chromium-flatpak",
    "firefox-flatpak",
    "google-chrome",
    "chromium",
    "firefox",
  }

  for _, id in ipairs(order) do
    if candidates[id].ok() then return candidates[id] end
  end

  return nil
end

local function launcher_script(cfg, browser)
  local url = cfg.url
  local profile = expand(cfg.profile_dir)
  local log_dir = expand(cfg.install_dir .. "/logs")
  local browser_command = browser and browser.command or "xdg-open"
  local browser_kind = browser and browser.kind or "xdg"
  local kiosk_flag = cfg.kiosk and "1" or "0"

  return [[#!/usr/bin/env bash
set -euo pipefail

APP_NAME="TryHackMe"
URL="]]
    .. url .. [["
PROFILE_DIR="]]
    .. profile .. [["
LOG_DIR="]]
    .. log_dir .. [["
BROWSER_COMMAND="]]
    .. browser_command .. [["
BROWSER_KIND="]]
    .. browser_kind .. [["
KIOSK="]]
    .. kiosk_flag .. [["

mkdir -p "$PROFILE_DIR" "$LOG_DIR"

# Keep credentials inside the browser profile/session. Never store them in Hermes config.
# Good Game Mode defaults: new window, no first-run, no default-browser nagging.

if [[ "$BROWSER_KIND" == "chromium" ]]; then
  FLAGS=(
    --new-window
    --user-data-dir="$PROFILE_DIR"
    --no-first-run
    --no-default-browser-check
    --disable-features=TranslateUI
    --start-maximized
  )

  if [[ "$KIOSK" == "1" ]]; then
    FLAGS+=(--kiosk)
  fi

  # shellcheck disable=SC2086
  exec $BROWSER_COMMAND "${FLAGS[@]}" "$URL"
elif [[ "$BROWSER_KIND" == "firefox" ]]; then
  FLAGS=(
    -profile "$PROFILE_DIR"
    -no-remote
    --new-window
  )

  if [[ "$KIOSK" == "1" ]]; then
    FLAGS+=(--kiosk)
  fi

  # shellcheck disable=SC2086
  exec $BROWSER_COMMAND "${FLAGS[@]}" "$URL"
else
  exec xdg-open "$URL"
fi
]]
end

local function vpn_script(cfg)
  local ovpn = expand(cfg.ovpn_path)
  local install_dir = expand(cfg.install_dir)
  return [[#!/usr/bin/env bash
set -euo pipefail

OVPN="]]
    .. ovpn .. [["
STATE_DIR="]]
    .. install_dir .. [[/vpn"
PID_FILE="$STATE_DIR/openvpn.pid"
LOG_FILE="$STATE_DIR/openvpn.log"
mkdir -p "$STATE_DIR"

cmd="${1:-status}"

case "$cmd" in
  start)
    if [[ ! -f "$OVPN" ]]; then
      echo "Missing TryHackMe OpenVPN config: $OVPN"
      echo "Download your config from TryHackMe's Access page, then save it there."
      exit 2
    fi

    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "TryHackMe VPN already running. PID: $(cat "$PID_FILE")"
      exit 0
    fi

    if ! command -v openvpn >/dev/null 2>&1; then
      echo "openvpn is not installed or not on PATH."
      exit 3
    fi

    echo "Starting TryHackMe OpenVPN. You may be prompted for sudo." 
    sudo openvpn --config "$OVPN" --daemon --writepid "$PID_FILE" --log "$LOG_FILE"
    sleep 2
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "TryHackMe VPN started. PID: $(cat "$PID_FILE")"
      echo "Log: $LOG_FILE"
    else
      echo "VPN start attempted, but PID check failed. Check log: $LOG_FILE"
      exit 4
    fi
    ;;

  stop)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Stopping TryHackMe VPN. You may be prompted for sudo."
      sudo kill "$(cat "$PID_FILE")" || true
      rm -f "$PID_FILE"
      echo "TryHackMe VPN stopped."
    else
      echo "TryHackMe VPN is not running."
      rm -f "$PID_FILE"
    fi
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "running pid=$(cat "$PID_FILE") log=$LOG_FILE"
    else
      echo "stopped"
    fi
    ;;

  log)
    touch "$LOG_FILE"
    tail -n 80 "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 {start|stop|status|log}"
    exit 1
    ;;
esac
]]
end

local function desktop_entry(cfg)
  local launcher = expand(cfg.bin_dir .. "/" .. cfg.launcher_name)
  local icon = "applications-internet"
  return [[Desktop Entry
Type=Application
Name=TryHackMe - Game Mode
Comment=Launch TryHackMe in a dedicated browser profile for Steam Deck Game Mode
Exec=]] .. launcher .. [[
Terminal=false
Categories=Network;Education;Game;
Icon=]] .. icon .. [[
StartupNotify=true
]]
end

local function config_example(cfg)
  return [[return {
  -- Browser URL used by the launcher.
  url = "https://tryhackme.com/dashboard",

  -- Browser selection: auto, chrome-flatpak, chromium-flatpak, firefox-flatpak,
  -- google-chrome, chromium, firefox.
  browser = "auto",

  -- Keep false for login flows. Turn true after login if you want fullscreen kiosk behavior.
  kiosk = false,

  -- Save your TryHackMe OpenVPN config here after downloading it from your THM Access page.
  ovpn_path = "~/.config/hermes-tryhackme/tryhackme.ovpn",

  -- Optional VPN helper. This does not auto-download or auto-login.
  vpn_enabled = true,
}
]]
end

local function make_paths(cfg)
  return {
    install_dir = expand(cfg.install_dir),
    profile_dir = expand(cfg.profile_dir),
    bin_dir = expand(cfg.bin_dir),
    config_dir = expand(cfg.config_dir),
    desktop_dir = expand(cfg.desktop_dir),
    launcher = expand(cfg.bin_dir .. "/" .. cfg.launcher_name),
    vpn = expand(cfg.bin_dir .. "/" .. cfg.vpn_name),
    desktop = expand(cfg.desktop_dir .. "/" .. cfg.desktop_filename),
    local_config = expand(cfg.config_dir .. "/config.lua"),
    ovpn = expand(cfg.ovpn_path),
  }
end

local function print_kv(key, value)
  io.write(string.format("%-22s %s\n", key .. ":", tostring(value)))
end

function Extension.detect(ctx)
  local cfg = merge_config(load_local_config())
  local browser = detect_browser(cfg.browser)
  local steamdeck = exists("/etc/os-release") and (read_file("/etc/os-release") or ""):lower():find("steamos", 1, true) ~= nil
  return {
    ok = true,
    matched = not is_windows,
    confidence = steamdeck and 0.95 or 0.65,
    steamdeck = steamdeck,
    browser = browser and browser.label or nil,
    reason = steamdeck and "SteamOS detected" or "Linux-like system detected; Steam Deck not guaranteed",
  }
end

function Extension.install(ctx, opts)
  opts = opts or {}
  local cfg = merge_config(load_local_config())
  local paths = make_paths(cfg)
  local browser = detect_browser(cfg.browser)

  if is_windows then
    return { ok = false, error = "This extension targets SteamOS/Linux for Steam Deck Game Mode." }
  end

  mkdir_p(paths.install_dir)
  mkdir_p(paths.profile_dir)
  mkdir_p(paths.bin_dir)
  mkdir_p(paths.config_dir)
  mkdir_p(paths.desktop_dir)
  mkdir_p(paths.install_dir .. "/logs")
  mkdir_p(paths.install_dir .. "/vpn")

  if not exists(paths.local_config) then
    local ok, err = write_file(paths.local_config, config_example(cfg))
    if not ok then return { ok = false, error = "Could not write config: " .. tostring(err) } end
  end

  local ok1, err1 = write_file(paths.launcher, launcher_script(cfg, browser))
  if not ok1 then return { ok = false, error = "Could not write launcher: " .. tostring(err1) } end
  chmod_x(paths.launcher)

  local ok2, err2 = write_file(paths.vpn, vpn_script(cfg))
  if not ok2 then return { ok = false, error = "Could not write VPN helper: " .. tostring(err2) } end
  chmod_x(paths.vpn)

  local ok3, err3 = write_file(paths.desktop, desktop_entry(cfg))
  if not ok3 then return { ok = false, error = "Could not write desktop entry: " .. tostring(err3) } end

  local report = {
    ok = true,
    message = "TryHackMe Steam Deck launcher installed.",
    paths = paths,
    browser = browser and browser.label or "No supported browser detected; xdg-open fallback will be used.",
    next_steps = {
      "Open Desktop Mode.",
      "Open Steam > Games > Add a Non-Steam Game to My Library.",
      "Browse to " .. paths.launcher .. " and add it.",
      "Return to Game Mode and launch 'TryHackMe - Game Mode'.",
      "Sign into TryHackMe in the launched browser window once; the session should persist in the dedicated profile.",
      "For VPN labs, download your TryHackMe .ovpn config to " .. paths.ovpn .. " then run: " .. paths.vpn .. " start",
    },
  }

  return report
end

function Extension.wire(ctx, opts)
  return Extension.install(ctx, opts)
end

function Extension.doctor(ctx, opts)
  local cfg = merge_config(load_local_config())
  local paths = make_paths(cfg)
  local browser = detect_browser(cfg.browser)
  local osrel = read_file("/etc/os-release") or ""
  local steamdeck = osrel:lower():find("steamos", 1, true) ~= nil
  local issues = {}
  local warnings = {}

  if is_windows then table.insert(issues, "This extension is designed for SteamOS/Linux, not Windows.") end
  if not steamdeck then table.insert(warnings, "SteamOS was not detected. This may still work on Linux, but it is optimized for Steam Deck.") end
  if not browser then table.insert(warnings, "No supported browser detected. Install Chrome/Chromium/Firefox or rely on xdg-open fallback.") end
  if not exists(paths.launcher) then table.insert(issues, "Launcher missing: " .. paths.launcher) end
  if not exists(paths.desktop) then table.insert(warnings, "Desktop entry missing: " .. paths.desktop) end
  if cfg.vpn_enabled and not exists(paths.ovpn) then table.insert(warnings, "TryHackMe OpenVPN config missing: " .. paths.ovpn) end
  if cfg.vpn_enabled and not command_exists("openvpn") then table.insert(warnings, "openvpn command not found. VPN helper will not work until OpenVPN is installed/available.") end
  if not command_exists("steam") then table.insert(warnings, "steam command not found on PATH. You can still add the launcher manually in Desktop Mode.") end

  return {
    ok = #issues == 0,
    steamdeck = steamdeck,
    browser = browser and browser.label or nil,
    launcher = paths.launcher,
    desktop = paths.desktop,
    ovpn = paths.ovpn,
    issues = issues,
    warnings = warnings,
  }
end

function Extension.launch(ctx, opts)
  local cfg = merge_config(load_local_config())
  local paths = make_paths(cfg)
  if not exists(paths.launcher) then
    local installed = Extension.install(ctx, opts)
    if not installed.ok then return installed end
  end
  exec(shell_quote(paths.launcher) .. " >/dev/null 2>&1 &")
  return { ok = true, message = "TryHackMe launcher started." }
end

function Extension.vpn(ctx, action)
  local cfg = merge_config(load_local_config())
  local paths = make_paths(cfg)
  action = action or "status"
  if not exists(paths.vpn) then
    local installed = Extension.install(ctx, {})
    if not installed.ok then return installed end
  end
  exec(shell_quote(paths.vpn) .. " " .. shell_quote(action))
  return { ok = true, message = "VPN helper command executed: " .. action }
end

function Extension.uninstall(ctx, opts)
  opts = opts or {}
  local cfg = merge_config(load_local_config())
  local paths = make_paths(cfg)
  local keep_profile = opts.keep_profile ~= false

  local commands = {
    "rm -f " .. shell_quote(paths.launcher),
    "rm -f " .. shell_quote(paths.vpn),
    "rm -f " .. shell_quote(paths.desktop),
  }

  if not keep_profile then
    table.insert(commands, "rm -rf " .. shell_quote(paths.install_dir))
    table.insert(commands, "rm -rf " .. shell_quote(paths.config_dir))
  end

  for _, cmd in ipairs(commands) do exec(cmd) end

  return {
    ok = true,
    message = keep_profile
      and "Uninstalled launcher files. Browser profile/config preserved."
      or "Uninstalled launcher files and removed profile/config.",
  }
end

function Extension.activate(ctx)
  if not ctx or not ctx.commands or not ctx.commands.register then
    return Extension
  end

  ctx.commands.register("tryhackme.steamdeck.install", {
    description = "Install TryHackMe Steam Deck Game Mode launcher wiring.",
    handler = function(args) return Extension.install(ctx, args) end,
  })

  ctx.commands.register("tryhackme.steamdeck.wire", {
    description = "Wire TryHackMe launcher into the project/system.",
    handler = function(args) return Extension.wire(ctx, args) end,
  })

  ctx.commands.register("tryhackme.steamdeck.doctor", {
    description = "Run TryHackMe Steam Deck diagnostics.",
    handler = function(args) return Extension.doctor(ctx, args) end,
  })

  ctx.commands.register("tryhackme.steamdeck.launch", {
    description = "Launch TryHackMe browser profile.",
    handler = function(args) return Extension.launch(ctx, args) end,
  })

  ctx.commands.register("tryhackme.steamdeck.vpn", {
    description = "Run VPN helper action: start, stop, status, or log.",
    handler = function(args) return Extension.vpn(ctx, args and args.action or "status") end,
  })

  return Extension
end

local function print_result(result)
  if type(result) ~= "table" then print(tostring(result)); return end
  print_kv("ok", result.ok)
  if result.message then print_kv("message", result.message) end
  if result.error then print_kv("error", result.error) end
  if result.browser then print_kv("browser", result.browser) end
  if result.launcher then print_kv("launcher", result.launcher) end
  if result.desktop then print_kv("desktop", result.desktop) end
  if result.ovpn then print_kv("ovpn", result.ovpn) end

  if result.paths then
    print("\nGenerated paths:")
    for k, v in pairs(result.paths) do print("  " .. k .. " = " .. tostring(v)) end
  end

  if result.issues and #result.issues > 0 then
    print("\nIssues:")
    for _, v in ipairs(result.issues) do print("  - " .. v) end
  end

  if result.warnings and #result.warnings > 0 then
    print("\nWarnings:")
    for _, v in ipairs(result.warnings) do print("  - " .. v) end
  end

  if result.next_steps then
    print("\nNext steps:")
    for i, v in ipairs(result.next_steps) do print("  " .. i .. ". " .. v) end
  end
end

local function usage()
  print([[Hermes TryHackMe Steam Deck Extension

Usage:
  lua tryhackme_steamdeck.lua install
  lua tryhackme_steamdeck.lua wire
  lua tryhackme_steamdeck.lua doctor
  lua tryhackme_steamdeck.lua launch
  lua tryhackme_steamdeck.lua vpn start|stop|status|log
  lua tryhackme_steamdeck.lua uninstall [--purge]

Notes:
  - Add ~/.local/bin/hermes-tryhackme-launch as a Non-Steam Game from Desktop Mode.
  - Sign into TryHackMe inside the launched browser. Hermes never stores your password.
  - Put your TryHackMe OpenVPN config at ~/.config/hermes-tryhackme/tryhackme.ovpn.
]])
end

if registerCommand then
  registerCommand("/tryhackme", function(args_str)
    local parts = {}
    for w in (args_str or ""):gmatch("%S+") do table.insert(parts, w) end
    local command = parts[1] or "help"
    
    if command == "install" then
      print_result(Extension.install(nil, {}))
    elseif command == "wire" then
      print_result(Extension.wire(nil, {}))
    elseif command == "doctor" then
      print_result(Extension.doctor(nil, {}))
    elseif command == "launch" then
      print_result(Extension.launch(nil, {}))
    elseif command == "vpn" then
      print_result(Extension.vpn(nil, parts[2] or "status"))
    elseif command == "uninstall" then
      print_result(Extension.uninstall(nil, { keep_profile = parts[2] ~= "--purge" }))
    else
      usage()
    end
    return "TryHackMe Extension executed."
  end)
end
return Extension

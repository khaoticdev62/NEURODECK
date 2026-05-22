-- system_info.lua
-- Gathers basic system information using the execute() function

print("=== NEURODECK System Report ===")

-- OS information
local os_info = execute("uname -a 2>/dev/null || ver 2>/dev/null || echo Unknown OS")
print("OS: " .. (os_info or "Unknown"))

-- Hostname
local hostname = execute("hostname 2>/dev/null || echo Unknown")
print("Hostname: " .. (hostname:gsub("\n", "") or "Unknown"))

-- Uptime (Linux/Mac) or SystemInfo (Windows fallback)
local uptime = execute("uptime -p 2>/dev/null || systeminfo 2>/dev/null | findstr /C:\"System Boot Time\" || echo N/A")
if uptime and uptime ~= "" then
    print("Uptime: " .. uptime:gsub("\n", ""))
end

-- Disk usage
local disk = execute("df -h / 2>/dev/null | tail -1 || wmic logicaldisk get size,freespace,caption 2>/dev/null | head -3 || echo N/A")
if disk and disk ~= "" then
    print("Disk: " .. disk:gsub("\n", "  "))
end

print("=== End of System Report ===")

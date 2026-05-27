-- cleanup.lua
-- Utility script: list temp files and optionally clean them up
-- Demonstrates how to use execute() for maintenance tasks

print("=== NEURODECK Cleanup Utility ===")

-- List temp files (cross-platform)
local temp_list
if execute("uname 2>/dev/null"):find("Linux") or execute("uname 2>/dev/null"):find("Darwin") then
    temp_list = execute("ls -lh /tmp 2>/dev/null | head -20")
    print("\nTMP directory contents (/tmp):")
else
    temp_list = execute("dir /Q %TEMP% 2>nul | head /c 20")
    print("\nTMP directory contents (%TEMP%):")
end

if temp_list and temp_list ~= "" then
    print(temp_list)
else
    print("  (unable to read temp directory)")
end

-- Check disk space remaining
local disk_free = execute("df -h / 2>/dev/null | tail -1 | awk '{print $4}' || echo N/A")
if disk_free and disk_free ~= "" then
    print("\nFree disk space: " .. disk_free:gsub("\n", ""))
end

print("\n=== Cleanup script complete ===")
print("Tip: Use execute('rm -rf /tmp/<pattern>') to remove specific files.")

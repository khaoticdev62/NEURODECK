#!/usr/bin/env python3
import os

ROOT = "src-tauri/src"

def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    needs_apphandle = "AppHandle" in content
    needs_state = "State<'_" in content
    if not needs_apphandle and not needs_state:
        return

    # Already imports from crate::tauri_compat or crate::{...}
    if "use crate::{AppHandle" in content or "use crate::tauri_compat" in content:
        return

    items = []
    if needs_apphandle: items.append("AppHandle")
    if needs_state: items.append("State")

    import_line = f"use crate::{{{', '.join(items)}}};\n"

    # Insert after the last `use ` line, or at the top if none
    lines = content.splitlines(keepends=True)
    last_use_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("use "):
            last_use_idx = i

    if last_use_idx >= 0:
        lines.insert(last_use_idx + 1, import_line)
    else:
        lines.insert(0, import_line)

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)

def main():
    for dirpath, _, filenames in os.walk(ROOT):
        for fname in filenames:
            if fname.endswith(".rs"):
                process_file(os.path.join(dirpath, fname))
    print("Done adding compat imports.")

if __name__ == "__main__":
    main()

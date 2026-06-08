#!/usr/bin/env python3
"""Strip Tauri references from Rust source files for pure Electron migration."""
import os
import re
import sys

ROOT = "src-tauri/src"

def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    in_tauri_use = False
    brace_depth = 0

    for line in lines:
        stripped = line.strip()

        # Remove #[tauri::command]
        if stripped == "#[tauri::command]":
            continue

        # Track multi-line use tauri::{ ... };
        if re.match(r"use\s+tauri::\{.*", stripped):
            # Check if it closes on same line
            if stripped.endswith("};"):
                continue
            in_tauri_use = True
            brace_depth = stripped.count("{") - stripped.count("}")
            continue

        if in_tauri_use:
            brace_depth += line.count("{") - line.count("}")
            if stripped.endswith("};") and brace_depth <= 0:
                in_tauri_use = False
            continue

        # Single-line use tauri::...;
        if re.match(r"use\s+tauri::.*;\s*$", stripped):
            continue

        new_lines.append(line)

    content = "".join(new_lines)

    # Replace async runtime calls
    content = content.replace("tauri::async_runtime::spawn_blocking", "tokio::task::spawn_blocking")
    content = content.replace("tauri::async_runtime::spawn", "tokio::spawn")
    content = content.replace("tauri::async_runtime::block_on", "tokio::runtime::Handle::current().block_on")

    # Replace AppHandle and Emitter
    content = content.replace("tauri::AppHandle", "crate::bridge::WsBroadcaster")
    content = content.replace("tauri::Emitter::emit", "crate::bridge::EventEmitter::emit")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def main():
    for dirpath, _, filenames in os.walk(ROOT):
        for fname in filenames:
            if fname.endswith(".rs"):
                process_file(os.path.join(dirpath, fname))
    print("Done stripping tauri references.")

if __name__ == "__main__":
    main()

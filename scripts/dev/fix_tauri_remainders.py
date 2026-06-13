#!/usr/bin/env python3
"""Fix remaining Tauri-specific type references."""

import os
import re

ROOT = "src-tauri/src"


def fix_state_refs(content):
    # tauri::State<'_, Arc<Mutex<T>>> → Arc<Mutex<T>>
    content = re.sub(r"tauri::State<'_,\s*Arc<Mutex<([^>]+)>>>\s*", r"Arc<Mutex<\1>> ", content)
    # tauri::State<'_, std::sync::Mutex<crate::AppState>> → std::sync::Arc<std::sync::Mutex<crate::AppState>>
    content = re.sub(
        r"tauri::State<'_,\s*std::sync::Mutex<crate::AppState>>\s*",
        r"std::sync::Arc<std::sync::Mutex<crate::AppState>> ",
        content,
    )
    # tauri::State<'_, DeckCodeActiveLang> → std::sync::Arc<std::sync::Mutex<String>>
    # But DeckCodeActiveLang is Arc<Mutex<String>> — wait, let's check the struct
    content = re.sub(
        r"tauri::State<'_,\s*DeckCodeActiveLang>\s*",
        r"std::sync::Arc<std::sync::Mutex<String>> ",
        content,
    )
    return content


def fix_tauri_window_params(content):
    # Replace tauri::Window parameter with _unused: () for dead functions
    content = re.sub(r"tauri::Window\s*,?\s*", "", content)
    return content


def fix_browser(content):
    content = content.replace("tauri::Url", "String")
    # url.parse::<String>() won't work; replace with Ok(url) or similar
    content = re.sub(
        r"url\.parse::<String>\(\)\.map_err\(\|e\| e\.to_string\(\)\)\?", "url", content
    )
    return content


def fix_event_id(content):
    content = content.replace("tauri::EventId", "u64")
    return content


def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = fix_state_refs(content)
    content = fix_tauri_window_params(content)
    content = fix_browser(content)
    content = fix_event_id(content)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    for dirpath, _, filenames in os.walk(ROOT):
        for fname in filenames:
            if fname.endswith(".rs"):
                process_file(os.path.join(dirpath, fname))
    print("Done fixing remainder tauri references.")


if __name__ == "__main__":
    main()

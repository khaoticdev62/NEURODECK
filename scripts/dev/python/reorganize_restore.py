import os
import subprocess
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Files to move from root to docs/
DOCS_TO_MOVE = ["CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md"]

# Files to restore from commit 79e5b58^ at their .loose/inbox/ paths
FILES_TO_RESTORE = {
    ".loose/inbox/steam_deck_lcd_local_llm_full_spec_guide.md": "docs/steam_deck_lcd_local_llm_full_spec_guide.md",
    ".loose/inbox/steamos_llm_terminal_design_system_branding_bible.md": "docs/steamos_llm_terminal_design_system_branding_bible.md",
    ".loose/inbox/steam_input.vdf": "assets/steam_input/steam_input.vdf",
    ".loose/inbox/Controller Prompting System for Steam Deck.pdf": "docs/Controller Prompting System for Steam Deck.pdf",
    ".loose/inbox/Executive Summary For Prompt Generator.pdf": "docs/Executive Summary For Prompt Generator.pdf",
}


def run_cmd(args):
    print(f"Running: {' '.join(args)}")
    result = subprocess.run(args, cwd=ROOT_DIR, capture_output=True)
    if result.returncode != 0:
        print(f"Error output:\n{result.stderr.decode('utf-8', errors='ignore')}")
        raise RuntimeError(f"Command failed: {' '.join(args)}")
    return result.stdout


def main():
    print("=== Starting NEURODECK Reorganization & Restoration ===")

    # 1. Restore files from git history (79e5b58^)
    print("\n--- Restoring deleted documents and configurations ---")
    for git_path, target_rel in FILES_TO_RESTORE.items():
        target_path = os.path.join(ROOT_DIR, target_rel)
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        print(f"Restoring {git_path} -> {target_rel}")
        # Run git show in binary mode to handle PDFs correctly
        args = ["git", "show", f"79e5b58^:{git_path}"]
        file_bytes = run_cmd(args)

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        print(f"Restored: {target_rel}")

    # 2. Move root documents to docs/
    print("\n--- Moving root-level documentation to docs/ ---")
    for doc in DOCS_TO_MOVE:
        src = os.path.join(ROOT_DIR, doc)
        dest = os.path.join(ROOT_DIR, "docs", doc)

        if os.path.exists(src):
            print(f"Moving {doc} -> docs/{doc}")
            shutil.move(src, dest)
        else:
            print(f"Warning: {doc} not found at root (might have been moved already)")

    print("\n=== Reorganization & Restoration Steps Complete ===")


if __name__ == "__main__":
    main()

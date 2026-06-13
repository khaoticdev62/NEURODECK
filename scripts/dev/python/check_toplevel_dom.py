import re
import os

src_dir = r"c:\Users\thecr\Desktop\S-Term\frontend\src"
files = ["settings.js", "terminal.js", "canvas.js"]

for f_name in files:
    path = os.path.join(src_dir, f_name)
    print(f"\n--- Top-level DOM lookups in {f_name} ---")
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # We will trace lines to see if they are inside a function block
    brace_count = 0
    for idx, line in enumerate(lines):
        # Update brace count
        # Simple count (ignoring strings/comments for this quick check)
        stripped = re.sub(r'".*?"|\'.*?\'|`.*?`|//.*|/\*.*?\*/', "", line)

        # Check if line contains DOM methods at brace_count == 0
        if brace_count == 0:
            if (
                "document.getElementById" in line
                or "querySelector" in line
                or "addEventListener" in line
                or ".onclick =" in line
            ):
                print(f"Line {idx + 1:5d}: {line.strip()}")

        brace_count += stripped.count("{")
        brace_count -= stripped.count("}")

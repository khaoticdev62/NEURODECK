path = r"c:\Users\thecr\Desktop\S-Term\frontend\src\main.js.bak"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for innerHTML or appendChild on 'app' or document.getElementById('app')
# or check if there is an index.html in a public directory or somewhere else.
import re
matches = [m.start() for m in re.finditer(r'app', content, re.IGNORECASE)]
print(f"Total occurrences of 'app': {len(matches)}")

# Let's find all document.getElementById or querySelector in the first 1000 lines
lines = content.splitlines()
for idx, line in enumerate(lines[:1000]):
    if "document.getElementById" in line or "querySelector" in line:
        print(f"Line {idx+1}: {line.strip()}")

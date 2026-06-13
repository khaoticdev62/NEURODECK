path = r"c:\Users\thecr\Desktop\S-Term\frontend\src\main.js.bak"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(4330, 4350):
    print(f"{idx + 1:5d}: {lines[idx]}", end="")

import os
import re
import glob

def run():
    workspace = os.path.abspath(os.path.dirname(__file__))
    epics_file = os.path.join(workspace, '_bmad-output', 'planning-artifacts', 'epics.md')
    artifacts_dir = os.path.join(workspace, '_bmad-output', 'implementation-artifacts')

    if not os.path.exists(epics_file):
        print(f"Error: Could not find {epics_file}")
        return

    # 1. Read existing epics.md and parse into structure
    with open(epics_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    epics = {} # epic_num -> {"title": string, "lines_idx": int, "stories": {minor_num -> {"text": string, "done": bool, "idx": int}}}
    current_epic = None
    
    header_lines = []
    
    epic_pattern = re.compile(r"^##\s+Epic\s+(\d+):\s+(.*)$")
    story_pattern = re.compile(r"^(###\s+)(?:\[([xX\s])\]\s+)?(Story\s+(\d+)\.(\d+):\s+.*)$")

    for i, line in enumerate(lines):
        epic_match = epic_pattern.match(line)
        if epic_match:
            epic_num = int(epic_match.group(1))
            epic_title = epic_match.group(2)
            epics[epic_num] = {"title": epic_title, "idx": i, "stories": {}}
            current_epic = epic_num
            continue
            
        story_match = story_pattern.match(line)
        if story_match:
            hashes = story_match.group(1)
            check = story_match.group(2)
            text = story_match.group(3)
            major = int(story_match.group(4))
            minor = int(story_match.group(5))
            
            if current_epic is not None and major == current_epic:
                # Force foundational Epics 1-4 to be marked done since they predate artifacts
                if major <= 4:
                    is_done = True
                else:
                    is_done = check and check.lower() == 'x'
                epics[current_epic]["stories"][minor] = {"text": text, "done": is_done, "idx": i, "hashes": hashes}
            continue

    # 2. Discover ALL artifacts
    discovered_stories = []
    pattern = os.path.join(artifacts_dir, "*.md")
    files = glob.glob(pattern)
    
    artifact_story_pattern = re.compile(r"^#\s+Story\s+(\d+)\.(\d+):\s+(.*)$")
    
    for fp in files:
        major, minor, title, is_done = None, None, None, False
        with open(fp, 'r', encoding='utf-8') as af:
            for line in af:
                line = line.strip()
                if not major:
                    sm = artifact_story_pattern.match(line)
                    if sm:
                        major = int(sm.group(1))
                        minor = int(sm.group(2))
                        title = sm.group(3)
                if line.lower().startswith("status:"):
                    status_text = line.lower()
                    if 'done' in status_text or 'completed' in status_text:
                        is_done = True
        
        if major is not None and minor is not None:
            # Automatic baseline cutoff: Epics 1 through 4 are foundational Phase 1
            # features that were completed before the artifact system was standardized.
            if major <= 4:
                is_done = True
                
            discovered_stories.append((major, minor, title, is_done))

    # 3. Merge discovered stories into structure
    for major, minor, title, is_done in discovered_stories:
        if major not in epics:
            epics[major] = {"title": "Recovered Epic from BMAD Artifacts", "idx": -1, "stories": {}}
            
        if minor not in epics[major]["stories"]:
            epics[major]["stories"][minor] = {
                "text": f"Story {major}.{minor}: {title}",
                "done": is_done,
                "idx": -1,
                "hashes": "### "
            }
        else:
            # Update status if artifact says done
            if is_done:
                epics[major]["stories"][minor]["done"] = True

    # 4. Reconstruct epics.md
    output_lines = []
    
    # Keep original header lines (before first epic)
    first_epic_idx = min([e["idx"] for e in epics.values() if e["idx"] != -1], default=len(lines))
    output_lines.extend(lines[:first_epic_idx])
    
    # Sort epics by number
    for epic_num in sorted(epics.keys()):
        epic = epics[epic_num]
        if epic["idx"] != -1:
            # We had this epic before
            # The epic line itself:
            output_lines.append(f"## Epic {epic_num}: {epic['title']}\n")
        else:
            output_lines.append(f"\n## Epic {epic_num}: {epic['title']}\n")
            
        # Sort stories by minor number
        for minor_num in sorted(epic["stories"].keys()):
            story = epic["stories"][minor_num]
            check_str = "[x]" if story["done"] else "[ ]"
            output_lines.append(f"{story['hashes']}{check_str} {story['text']}\n")

    # Write output
    with open(epics_file, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)
        
    print(f"Successfully processed BMAD artifacts and updated epics.md!")
    print(f"Total Epics: {len(epics)}")
    
    total_stories = sum(len(e["stories"]) for e in epics.values())
    total_done = sum(1 for e in epics.values() for s in e["stories"].values() if s["done"])
    
    print(f"Current Status: {total_done} completed stories, {total_stories - total_done} pending stories.")

if __name__ == '__main__':
    run()

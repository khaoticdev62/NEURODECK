import json
import hashlib

files = [
    'aitools.lua', 'aliases.lua', 'coderunner.lua', 'docker.lua', 
    'filetools.lua', 'journal.lua', 'netcheck.lua', 'steamdeck.lua', 
    'sysevents.lua', 'workspace.lua'
]

entries = []
for f in files:
    path = 'plugins/' + f
    try:
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            lines = content.split('\n')
            title = lines[1].replace('--', '').strip() if len(lines) > 1 else f.replace('.lua', '')
            desc_lines = []
            for line in lines[2:]:
                if line.startswith('-- JPE:') or line.startswith('--'):
                    desc_lines.append(line.replace('-- JPE:', '').replace('--', '').strip())
                else:
                    break
            
            description = ' '.join(desc_lines) if desc_lines else title
            category = 'utility'
            if 'ai' in title.lower() or 'llm' in description.lower(): category = 'ai'
            if 'docker' in f or 'git' in f: category = 'integration'
            if 'system' in description.lower() or 'events' in f: category = 'system'
            if 'steamdeck' in f: category = 'gaming'
            if 'journal' in f or 'workspace' in f: category = 'productivity'

            f_base = f.replace('.lua', '')
            entry = {
                'id': f'com.khaotic.{f_base}',
                'name': title.split('—')[0].strip() if '—' in title else title,
                'author': 'Khaotic Labs',
                'version': '1.0.0',
                'description': description[:120] + '...' if len(description) > 120 else description,
                'tags': [f_base],
                'download_url': f'https://raw.githubusercontent.com/khaoticdev62/neurodeck-plugins/main/{f}',
                'lua_file': f,
                'sha256': hashlib.sha256(content.encode('utf-8')).hexdigest(),
                'category': category
            }
            entries.append(entry)
    except Exception as e:
        print(f'Error on {f}: {e}')

with open('registry_entries.json', 'w', encoding='utf-8') as out:
    json.dump(entries, out, indent=2)
print('Done!')

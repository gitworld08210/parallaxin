import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix the most common broken chain that causes TS1005 (missing ;)
    # Pattern: supabase.insert({ ... } as any).select("id").single() as any);
    # This was a result of a broken deletion.
    content = re.sub(r'supabase\.insert\(\{.*?\}\s*as\s*any\)\.select\("id"\)\.single\(.*?\)\s*as\s*any\)\s*;', '/* shimmed */', content)
    content = re.sub(r'supabase\.insert\(\{.*?\}\s*as\s*any\)\.select\("id"\)\.single\(.*?\)\s*;', '/* shimmed */', content)
    
    # 2. Fix broken try-catch blocks where the try block was partially deleted
    # Pattern: try { ... supabase.from("table") } catch ...
    # If a line ends with supabase.from("table") and the next line is a closing brace
    content = re.sub(r'supabase\.from\("[^"]+"\)\n\s*\}', r'/* shimmed */\n}', content)

    # 3. Fix specific errors like TS1381/TS1382 (Unexpected token in JSX)
    # This happens in InviteMemberModal and MemberActionsMenu
    if "InviteMemberModal.tsx" in path or "MemberActionsMenu.tsx" in path:
        content = re.sub(r'supabase\.filter\(', '.filter(', content)
        content = re.sub(r'supabase\.map\(', '.map(', content)

    # 4. Fix TS1109 (Expression expected) often caused by a trailing 'await' or broken 'then'
    content = re.sub(r'await\s*\n\s*\}', '/* shimmed */\n}', content)
    
    # 5. Generic cleanup for dangling supabase calls
    # If a line starts with supabase.from and doesn't end with a semicolon or comma, and the next line starts with a closing brace
    content = re.sub(r'supabase\.from\("[^"]+"\)\s*(\n\s*\})', r'/* shimmed */\1', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

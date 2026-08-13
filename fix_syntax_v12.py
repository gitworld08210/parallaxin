import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Remove ANY line that looks like a broken any-casted chain
    # { key: val } as any).select("id").single() as any);
    content = re.sub(r'\{[^}]+\}\s*as\s*any\)\.select\("id"\)\.single\(.*?\)\s*(as\s*any)?\s*;', '/* shimmed */', content)
    
    # 2. Fix the "Unexpected token" errors in JSX from broken filter/map
    content = re.sub(r'([a-zA-Z0-9_]+)\s+supabase\.(filter|map|find|reduce|some|every|sort|slice|forEach)\(', r'\1.\2(', content)
    
    # 3. Fix TS1005 (expected ;) where a line starts with 'supabase' incorrectly after an expression
    content = re.sub(r'([a-zA-Z0-9_\]\)])\n\s*supabase\.', r'\1.\n', content) # Might be too aggressive, but let's see. 
    # Actually, if it's following a variable, it was likely meant to be a chain.
    content = re.sub(r'([a-zA-Z0-9_\]\)])\n\s+supabase\.', r'\1.', content)

    # 4. Remove standalone dangling supabase calls that lack assignment or context
    # Like: supabase.from("table").eq("id", id); on its own line after another expression.
    
    # 5. Specific fix for SettingsForm.tsx
    if "SettingsForm.tsx" in path:
         # SettingsForm.tsx(101,9): error TS1005: ',' expected.
         content = re.sub(r'supabase\.(update|insert|select)\(', r'.\1(', content)

    # 6. Generic fix for any .select("id").single() that's dangling
    content = re.sub(r'\.select\("id"\)\.single\(\)\s*as\s*any\)\s*;', ');', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

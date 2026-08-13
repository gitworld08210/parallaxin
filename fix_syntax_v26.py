import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # Standardize Supabase method calls (fix await.from, await.select, etc.)
    content = content.replace('await.from(', 'await supabase.from(')
    content = content.replace('await.select(', 'await supabase.select(')
    content = content.replace('await.rpc(', 'await supabase.rpc(')
    content = content.replace('await.auth.', 'await supabase.auth.')
    content = content.replace('await.functions.', 'await supabase.functions.')
    
    # Fix the .on() chain in AppShell.tsx or similar
    content = re.sub(r'\.on\("postgres_changes"', r'.on("postgres_changes"', content)

    # General cleanup for any remaining await.supabase patterns
    content = re.sub(r'await\.supabase\.', 'await supabase.', content)

    with open(path, 'w') as f:
        f.write(content)

# Process all TS/TSX files
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

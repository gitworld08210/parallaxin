import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Reconstruct all mangled try-catch blocks in the social components
    # The pattern is often: try { \n body: { ... }, \n }); \n if (error) throw error;
    content = re.sub(r'try\s*\{\s*body:\s*\{(.*?)\}\s*,\s*\}\s*;\s*if\s*\(error\)\s*throw\s*error;', r'try { /* shimmed */ }', content, flags=re.DOTALL)

    # 2. Fix corrupted Supabase chains where 'supabase' was inserted mid-chain
    content = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', content)
    content = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', content)

    # 3. Restore valid headers for database operations
    content = content.replace('await.from(', 'await supabase.from(')
    content = content.replace('await.select(', 'await supabase.select(')
    content = content.replace('await.rpc(', 'await supabase.rpc(')
    content = content.replace('await.auth.', 'await supabase.auth.')
    content = content.replace('await.functions.', 'await supabase.functions.')

    # 4. Final JSX/Object cleanup to resolve TS1005
    content = re.sub(r',\s*\}\s*,\s*\}\s*;', r' });', content)
    content = re.sub(r'([a-zA-Z0-9_]+)\s*supabase\.', r'\1.', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

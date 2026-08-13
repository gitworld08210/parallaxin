import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix the mangled try block headers
    content = content.replace('try { /* shimmed */ }', 'try {')

    # 2. Fix the "await.auth" and "await.functions" patterns
    content = content.replace('await.auth.', 'await supabase.auth.')
    content = content.replace('await.functions.', 'await supabase.functions.')

    # 3. Clean up JSX/Object dangling prefixes
    content = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', content)
    content = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', content)

    # 4. Handle common object mangling in social components
    content = re.sub(r',\s*\}\s*,\s*\}\s*;', r' });', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

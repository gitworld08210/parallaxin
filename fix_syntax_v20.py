import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix the mangled try { /* shimmed */ } = await ...
    # This was a major source of TS2809 and TS1472.
    content = re.sub(r'try\s*\{\s*/\* shimmed \*/\s*\}\s*=\s*await\s+Promise\.resolve\(\{.*?\}\);', r'try { /* shimmed */ }', content, flags=re.DOTALL)

    # 2. Fix mangled await calls that were incorrectly prefixed or suffixed
    # e.g. await.functions.invoke or variable supabase.method
    content = re.sub(r'await\.functions\.', r'await supabase.functions.', content)
    content = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', content)
    content = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', content)

    # 3. Reconstruct mangled object literals and JSX expressions
    # This fixes cases like {key: val , } , } ; which were causing TS1005
    content = re.sub(r',\s*\}\s*,\s*\}\s*;', r' });', content)

    # 4. Specific fix for BecomeCreatorSheet.tsx / AccountSwitcherSheet.tsx style corruption
    # If we see a dangling catch after a mangled block, try to re-attach it correctly.
    content = re.sub(r'\}\s*catch\s*\(e:\s*any\)\s*\{', r'} catch (e: any) {', content)

    # 5. Global fix for ResetPassword.tsx
    content = content.replace('await.auth.', 'await supabase.auth.')

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

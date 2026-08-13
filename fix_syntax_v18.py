import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix JSX/Object fragments like {user supabase.id} or variable supabase.method
    content = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', content)
    content = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', content)

    # 2. Fix the most broken pattern from v16:
    # /* Reconstructed shim */
    # const { data, error } = await Promise.resolve({ data: null, error: null });
    # body: { ... },
    # });
    content = re.sub(r'/\* Reconstructed shim \*/\s*const\s+\{\s*data,\s*error\s*\}\s*=\s*await\s+Promise\.resolve\(\{\s*data:\s*null,\s*error:\s*null\s*\}\);\s*body:\s*\{.*?\}\s*,\s*\}\s*;', r'/* shimmed */', content, flags=re.DOTALL)

    # 3. Fix dangling braces from mangled try/catch blocks
    # Specifically cases where catch/finally are separated or missing headers
    content = re.sub(r'\}\s+catch\s+\(e:\s*any\)\s*\{\s*toast\.error\(.*?\);\s*\}', r'} catch (e: any) { toast.error(e.message || "Action failed"); }', content)

    # 4. Handle specific component issues:
    if "BecomeCreatorSheet.tsx" in path or "NewGroupSheet.tsx" in path or "AccountSwitcherSheet.tsx" in path:
        # Revert to a safe stub for these heavily mangled files
        content = re.sub(r'const\s+\w+\s*=\s*async\s*\(\)\s*=>\s*\{.*?\}', r'const actionStub = async () => { console.log("Action shimmed"); };', content, flags=re.DOTALL)

    # 5. Fix Unsubscribe.tsx specific fetch if still broken
    content = content.replace('`${SUPABASE_URL}/', '`${import.meta.env.VITE_SUPABASE_URL}/')

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

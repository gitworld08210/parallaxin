import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix "await.auth"
    content = content.replace('await.auth.', 'await supabase.auth.')

    # 2. Fix the "Unexpected token" in Auth.tsx style (missing }); )
    # This was specific to Auth.tsx but might be elsewhere.
    # Pattern: await setDoc(doc(db, "...", ...), { [content] \n \n toast.success
    content = re.sub(r'(await\s+setDoc\(doc\(db,\s*"[^"]+",\s*[^)]+\),\s*\{[^;]*?)(\n\s+toast\.success)', r'\1\n      });\2', content, flags=re.MULTILINE | re.DOTALL)

    # 3. Reconstruct mangled try-blocks that look like:
    # try {
    #    /* Reconstructed shim */
    #    const { data, error } = await Promise.resolve({ data: null, error: null });
    #    body: { ... },
    #  });
    # This was a result of previous scripts.
    content = re.sub(r'const\s+\{\s*data,\s*error\s*\}\s*=\s*await\s+Promise\.resolve\(\{\s*data:\s*null,\s*error:\s*null\s*\}\);\s*body:\s*\{.*?\}\s*,\s*\}\s*;', r'const { data, error } = await Promise.resolve({ data: null, error: null });', content, flags=re.DOTALL)

    # 4. Remove dangling dots or "supabase." inside expressions
    content = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', content)
    content = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', content)

    # 5. Fix common broken ternary/object patterns
    content = re.sub(r',\s*\}\s*,\s*\}\s*;', r' });', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

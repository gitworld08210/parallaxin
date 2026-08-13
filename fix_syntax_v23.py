import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix await followed by dot (which should have been supabase)
    content = re.sub(r'await\.(from|select|rpc|auth|functions|channel|on|subscribe|removeChannel)\(', r'await supabase.\1(', content)
    
    # 2. Fix supabase incorrectly placed in the middle of a dot chain
    content = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', content)
    content = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', content)

    # 3. Clean up mangled headers
    content = content.replace('try { /* shimmed */ }', 'try {')
    
    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

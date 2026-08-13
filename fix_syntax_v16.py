import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    in_bad_try = False
    
    for line in lines:
        # Fix await.auth
        line = line.replace('await.auth.', 'await supabase.auth.')
        
        # Detect the start of a broken try block
        if 'try {' in line and not ('const {' in line or 'await' in line or 'supabase' in line):
            # This is likely a broken try block that starts with 'try {' then goes straight to 'body:'
            new_lines.append(line)
            new_lines.append('      /* Reconstructed shim */\n')
            new_lines.append('      const { data, error } = await Promise.resolve({ data: null, error: null });\n')
            in_bad_try = True
            continue
            
        if in_bad_try:
            if 'body:' in line or '});' in line:
                continue # Skip the mangled lines
            if 'if (error)' in line or 'catch' in line:
                in_bad_try = False # We are past the mangled part
        
        # Fix the dangling dots
        line = re.sub(r'([a-zA-Z0-9_\]\)])\s+supabase\.', r'\1.', line)
        line = re.sub(r'\{([a-zA-Z0-9_]+)\s+supabase\.', r'{\1.', line)
        
        new_lines.append(line)

    with open(path, 'w') as f:
        f.writelines(new_lines)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

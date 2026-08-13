import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix lines starting with a dot followed by common methods if they aren't part of a chain
    # e.g. .on(...) or .map(...) at the start of a line after a semicolon or empty line
    content = re.sub(r';\s*\n\s*\.([a-zA-Z0-9_]+)\(', r';\nsupabase.\1(', content)
    content = re.sub(r'\}\s*\n\s*\.([a-zA-Z0-9_]+)\(', r'}\nsupabase.\1(', content)

    # 2. Fix lines that just have ".on" or ".subscribe" etc. by prefixing with supabase
    # if it's not following a valid character for a chain.
    content = re.sub(r'(\n\s*)\.([a-zA-Z0-9_]+)\(', r'\1supabase.\2(', content)
    
    # 3. Fix double supabase
    content = re.sub(r'supabase\.supabase\.', 'supabase.', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

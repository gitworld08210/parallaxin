import os
import re

patterns = [
    # Fix broken supabase chains
    (r'(\n\s*)\.(from|select|rpc|channel)\(', r'\1supabase.\2('),
    # Fix broken try-catch blocks where the content was deleted but the surrounding context remains
    (r'try\s*{\s*}', 'try { /* No-op */ }'),
    # Fix trailing commas or points at ends of blocks
    (r',\s*\);', ');'),
]

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            new_content = content
            for pattern, replacement in patterns:
                new_content = re.sub(pattern, replacement, new_content)
            
            # Additional fix: If a line starts with supabase.from but is missing a semicolon or is just a dangling statement
            # This is complex, let's just make sure they all have a supabase prefix if they start with .
            
            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Fixed syntax in {path}")


import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            # Replace ".from(" or ".select(" or ".rpc(" at the start of a line or after spaces 
            # with "supabase.from(" etc if it looks like a broken chain
            new_content = re.sub(r'(\n\s*)\.(from|select|rpc|channel)\(', r'\1supabase.\2(', content)
            
            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Fixed {path}")

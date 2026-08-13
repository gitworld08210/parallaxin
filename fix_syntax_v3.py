import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # Replace lines starting with whitespace then .from( or .select( or .rpc(
    # with supabase.from( etc.
    content = re.sub(r'(\n\s*)\.(from|select|rpc|channel|insert|update|delete|upsert)\(', r'\1supabase.\2(', content)
    
    # Fix broken assignments like: const { data, error } = await
    #   supabase.from("table")
    # This is actually fine as long as there is an await and the next part is an expression.
    
    # Fix specific patterns like supabase.rpc("...", { args }); if it was broken
    # Example: 
    #   await supabase.rpc("name", {
    #     arg: val
    #   });
    
    # If there are empty try/catch blocks that were stripped of content
    content = re.sub(r'try\s*{\s*}', 'try { /* shimmed */ }', content)
    
    # Fix common missing semicolons if a line starts with supabase.
    # Actually, prettier/vite handles most of that.
    
    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # Identify common broken method chains where the prefix is missing
    # Example:
    # const { data } = await
    #    .from("table")
    # OR
    # const { data } = await
    #    supabase.select("*")
    
    # Let's target lines that start with whitespace and then .from, .select, etc.
    # and ensure they have 'supabase' prepended if they don't already.
    
    new_content = re.sub(r'(\n\s*)\.(from|select|rpc|channel|insert|update|delete|upsert|upload|download|list|getPublicUrl)\(', r'\1supabase.\2(', content)
    
    # Fix broken return/assignment statements where the expression was deleted
    # Example: if (error) throw error;
    # (data ?? []) as any);
    # This might need manual fixes if it's too broken.
    
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Fixed {path}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

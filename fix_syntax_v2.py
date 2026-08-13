import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix broken supabase calls that are missing the 'await supabase' prefix but have the chain
    # Look for lines that start with .from, .select, etc. and were likely broken by the previous sed
    # We want to find cases where it's inside an async function or block.
    # A common pattern is:
    # const { data, error } = await
    #   .from("table")
    # This was likely broken to:
    # const { data, error } = await
    #   supabase.from("table")
    # But some might be:
    #   .from("table")
    
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('.'):
            # If it starts with a dot, it might be a broken chain.
            # However, if it was already fixed to supabase.from, we don't touch it.
            # If it's still just .from, we add supabase.
            if stripped.startswith('.from(') or stripped.startswith('.select(') or stripped.startswith('.rpc(') or stripped.startswith('.channel('):
                indent = line[:line.find('.')]
                new_lines.append(indent + "supabase" + stripped)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    # 2. Fix broken object literals inside supabase calls
    # Pattern: supabase.from("table").insert({ key: val, }); 
    # The previous sed might have left some dangling commas or braces.
    
    # 3. Fix empty try blocks or broken try blocks
    content = re.sub(r'try\s*{\s*}', 'try { /* shimmed */ }', content)
    
    # 4. Fix specific broken pattern found in error logs:
    # .insert({
    #    key: val,
    #  })
    # If the .insert was removed, we might have:
    # {
    #   key: val,
    # }
    # This is hard to fix generally. Let's look for known broken files.
    
    if content != content: # This is always false, just a placeholder for the check
        pass
        
    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

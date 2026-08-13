import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix the `{items supabase.filter(...)` pattern
    # It should be `{items.filter(...)`
    content = re.sub(r'([a-zA-Z0-9_]+)\s+supabase\.filter\(', r'\1.filter(', content)
    content = re.sub(r'([a-zA-Z0-9_]+)\n\s+supabase\.filter\(', r'\1.filter(', content)

    # 2. Fix other common array methods that might have been prefixed
    for method in ['map', 'find', 'reduce', 'some', 'every', 'sort', 'slice']:
        content = re.sub(r'([a-zA-Z0-9_]+)\s+supabase\.' + method + r'\(', r'\1.' + method + '(', content)
        content = re.sub(r'([a-zA-Z0-9_]+)\n\s+supabase\.' + method + r'\(', r'\1.' + method + '(', content)

    # 3. Fix cases where supabase was inserted before a dot at the start of a line incorrectly
    # e.g. .map(...) -> supabase.map(...) is wrong if it's following an array
    # This is harder to catch without context, but let's try to find lines that start with supabase.map etc.
    # and see if the previous line ended with a variable or expression.
    
    # 4. Fix specific dangling syntax like supabase.select("id").single() as any); 
    # if it was left over from a partial deletion.
    # If a line contains ONLY supabase.select... or starts with it after a {
    
    # 5. Fix common broken patterns in the logs
    # SaveToCollectionSheet.tsx(22,108): error TS1005: ';' expected.
    # This often means a chain was broken.
    
    # Let's try to remove 'supabase' if it's preceded by a closing bracket or paren on the previous line (ignoring whitespace)
    # This handles:
    # someArray
    # supabase.filter(...)
    content = re.sub(r'(\]|\))\n\s*supabase\.', r'\1.', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

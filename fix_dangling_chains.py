import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Pattern 1: { ... } as any).select("id").single() as any);
        # This usually means a missing 'const { data, error } = await supabase.from("table").insert('
        if ').select("id").single() as any);' in line or ').select("id").single());' in line:
            # Try to find the line before it or identify the table
            # Often it's on the same line now due to previous replacements
            # Example: supabase.insert({ ... } as any).select("id").single() as any);
            match = re.search(r'supabase\.insert\(\{(.*?)\}\s*as\s*any\)\.select\("id"\)\.single\(.*?\);', line)
            if match:
                # We need the table name. In these broken files, it was often deleted.
                # We'll try to infer it from the file name or use a generic 'placeholder'
                # or look for clues in the properties.
                props = match.group(1)
                table = "unknown"
                if "story_id" in props: table = "story_stickers"
                if "post_id" in props: table = "comments"
                if "highlight_id" in props: table = "highlight_stories"
                if "user_id" in props and "title" in props: table = "highlights"
                
                line = re.sub(r'supabase\.insert\(\{(.*?)\}\s*as\s*any\)\.select\("id"\)\.single\(.*?\);', 
                              f'const {{ data, error }} = await supabase.from("{table}").insert({{\\1}}).select("id").single();', line)

        # Pattern 2: just supabase.from("table") on a line by itself
        # Pattern 3: .eq(...) or other chain methods on a line by itself
        
        new_lines.append(line)
        i += 1

    with open(path, 'w') as f:
        f.writelines(new_lines)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

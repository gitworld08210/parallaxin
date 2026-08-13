import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Prefix method chains starting with a dot with 'supabase'
    # We do this for a wider range of methods
    methods = ['from', 'select', 'rpc', 'channel', 'insert', 'update', 'delete', 'upsert', 'upload', 'download', 'list', 'getPublicUrl', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps', 'textSearch', 'match', 'not', 'or', 'filter', 'order', 'limit', 'range', 'single', 'maybeSingle', 'csv']
    pattern = r'(\n\s*)\.(' + '|'.join(methods) + r')\('
    content = re.sub(pattern, r'\1supabase.\2(', content)
    
    # 2. Fix dangling close-parens followed by semicolons that were likely left over from deleted chains
    # Pattern: ); followed by ) on a new line or similar
    # This is tricky, let's look for specific error patterns.
    
    # 3. Fix cases like: const { data } = await supabase.from("table")supabase.select("*")
    # This happens if the previous regex ran twice or combined lines.
    content = re.sub(r'supabase\.from\("([^"]+)"\)supabase\.', r'supabase.from("\1").', content)
    
    # 4. Fix empty try blocks
    content = re.sub(r'try\s*{\s*}', 'try { /* shimmed */ }', content)
    
    # 5. Fix common broken assignment syntax from logs
    # const { data, error } = await
    #    supabase.from("table")
    # This is actually fine in TS if there's a newline.
    
    # Let's fix the specific ReportSheet pattern globally if possible
    # { key: val } as any).select("id").single() as any);
    content = re.sub(r'\{\s*([^}]+)\s*\}\s*as\s*any\)\.select\("id"\)\.single\(\)\s*as\s*any\)\s*;', r'{\1});', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # Fix corrupted array methods in JSX and elsewhere
    # Pattern: {variable supabase.filter(...) -> {variable.filter(...)
    content = re.sub(r'([a-zA-Z0-9_]+)\s+supabase\.(filter|map|find|reduce|some|every|sort|slice|forEach)\(', r'\1.\2(', content)
    
    # Fix corrupted Chart components or others with similar patterns
    # Pattern: (props supabase.something -> (props.something
    content = re.sub(r'\(([a-zA-Z0-9_]+)\s+supabase\.', r'(\1.', content)
    
    # Fix dangling supabase prefixes at start of lines that should be chains
    # If the previous line ended with a dot or a variable
    content = re.sub(r'(\n\s*)supabase\.(filter|map|find|reduce|some|every|sort|slice|forEach)\(', r'\1.\2(', content)

    # Specific fix for SettingsForm.tsx (TS1005: ',' expected)
    if "SettingsForm.tsx" in path:
        content = re.sub(r'supabase\.update\(', '.update(', content)

    # Specific fix for chart.tsx
    if "chart.tsx" in path:
        content = re.sub(r'supabase\.', '.', content)

    with open(path, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            fix_file(os.path.join(root, file))

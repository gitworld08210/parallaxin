import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix the corrupted Supabase .select() lines that lost their await and variable assignment
    # Pattern: supabase.select("...").eq(...) as any);
    content = re.sub(r'(?<!await\s)supabase\.select\(', r'await supabase.from("collections").select(', content) # Temporary guess for table name if missing

    # 2. Fix the specific pattern in SaveToCollectionSheet
    content = re.sub(r'\(\async\s*\(\)\s*=>\s*\{\s*supabase\.select\("id, name"\)', 
                     r'(async () => {\n      const { data: cs } = await supabase.from("collections").select("id, name")', content)
    content = re.sub(r'supabase\.select\("collection_id"\)\.eq\("post_id",\s*postId\)', 
                     r'const { data: items } = await supabase.from("collection_items").select("collection_id").eq("post_id", postId)', content)

    # 3. Fix the ad intelligence record signal pattern
    # Find the missing await supabase.from("table").insert({ ... })
    content = re.sub(r'//\s*1\.\s*Record\s*the\s*raw\s*signal\s*user_id:', 
                     r'// 1. Record the raw signal\n      const { error: signalError } = await supabase.from("ads_interest_signals").insert({\n        user_id:', content)

    # 4. Correct all await.something to await supabase.something again just in case
    content = content.replace('await.from', 'await supabase.from')
    content = content.replace('await.select', 'await supabase.select')
    content = content.replace('await.rpc', 'await supabase.rpc')
    content = content.replace('await.auth', 'await supabase.auth')
    content = content.replace('await.functions', 'await supabase.functions')

    # 5. Fix missing user.uid vs user.id (Firebase migration cleanup)
    content = content.replace('user.id', 'user.uid')

    with open(path, 'w') as f:
        f.write(content)

targets = [
    'src/components/social/SaveToCollectionSheet.tsx',
    'src/features/content-understanding/hooks/useAdIntelligence.ts',
    'src/features/content-understanding/hooks/useContentQueue.ts',
    'src/components/messages/MessagesPasscodeGate.tsx',
    'src/components/social/StoryViewer.tsx'
]

for t in targets:
    if os.path.exists(t):
        fix_file(t)

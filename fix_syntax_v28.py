import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Reconstruct StoryViewer await/insert pattern
    content = re.sub(r'//\s*Record\s*view.*?\n.*?user_id:\s*user\.id,.*?\n.*?\n.*?\n.*?\n.*?\});', 
                     r'await supabase.from("story_views").insert({ user_id: user.uid, story_id: currentStory.id });', content, flags=re.DOTALL)

    # 2. Fix TipSheet supabase chain
    content = re.sub(r'const\s+\{.*?\}\s*=\s*await\s*supabase\.from\("tips"\)\.insert\(\{.*?\}\);', 
                     r'const { error } = await supabase.from("tips").insert({ sender_id: user.uid, recipient_id, amount: Number(amount), post_id });', content, flags=re.DOTALL)

    # 3. Fix CreatorEarnings try block structural errors
    content = re.sub(r'try\s*\{\s*const\s+\{.*?\}\s*=\s*await\s*supabase\.rpc\(.*?\);\s*if\s*\(error\)\s*throw\s*error;', 
                     r'try { const { data, error } = await supabase.rpc("get_creator_stats", { _creator_id: user.uid }); if (error) throw error;', content, flags=re.DOTALL)

    # 4. Correct all user.id to user.uid
    content = content.replace('user.id', 'user.uid')

    # 5. Generic structural repairs for corrupted try/catch blocks missing closing braces
    content = re.sub(r'\}\s*catch\s*\(e:\s*any\)\s*\{\s*toast\.error\(e\.message\s*\|\|\s*"Action\s*failed"\);\s*\}', 
                     r'} catch (e: any) { toast.error(e.message || "Action failed"); }', content)

    with open(path, 'w') as f:
        f.write(content)

targets = [
    'src/components/social/StoryViewer.tsx',
    'src/components/social/TipSheet.tsx',
    'src/components/wallet/CreatorEarnings.tsx',
    'src/contexts/CallProvider.tsx',
    'src/pages/Compose.tsx'
]

for t in targets:
    if os.path.exists(t):
        fix_file(t)

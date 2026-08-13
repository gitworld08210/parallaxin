import os
import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Fix the "actionStub = ... = await Promise.resolve" corruption
    # Pattern: const actionStub = async () => { console.log("Action shimmed"); }; = await Promise.resolve({ data: null, error: null });
    content = re.sub(r'const\s+actionStub\s*=\s*async\s*\(\)\s*=>\s*\{\s*console\.log\("Action shimmed"\);\s*\}\s*;\s*=\s*await\s*Promise\.resolve\(\{.*?\}\);', '', content)
    
    # 2. Fix corrupted RPC/Supabase calls in social/DM components
    # Often missing the closing }); and try block integration
    # Find: await.rpc("...", { ... if (error) throw error;
    def fix_rpc(match):
        rpc_call = match.group(0)
        if '});' not in rpc_call:
            # Try to find where it should end (often before if (error))
            rpc_call = re.sub(r'(await\s*supabase\.rpc\(.*?)(\s*if\s*\(error\))', r'\1 });\2', rpc_call, flags=re.DOTALL)
        return rpc_call
    
    content = re.sub(r'await\s*supabase\.rpc\(.*?\s*if\s*\(error\)', fix_rpc, content, flags=re.DOTALL)

    # 3. Fix missing closing braces in Firestore updates (common in AccountSwitcherSheet)
    # updatedAt: Date.now(), \n toast.success
    content = re.sub(r'(updatedAt:\s*Date\.now\(\),?)(\s*toast\.success)', r'\1\n        });\2', content)
    
    # 4. Fix creator mode updateDoc missing brace
    content = re.sub(r'(creator_activated_at:\s*new\s*Date\(\)\.toISOString\(\)?)(\s*toast\.success)', r'\1\n      });\2', content)

    # 5. General cleanup of "await.something"
    content = content.replace('await.rpc', 'await supabase.rpc')
    content = content.replace('await.from', 'await supabase.from')
    content = content.replace('await.select', 'await supabase.select')
    content = content.replace('await.auth', 'await supabase.auth')

    with open(path, 'w') as f:
        f.write(content)

# Targeted files first
targets = [
    'src/components/dm/NewGroupSheet.tsx',
    'src/components/layout/AccountSwitcherSheet.tsx',
    'src/components/creator/BecomeCreatorSheet.tsx',
    'src/components/social/NewHighlightSheet.tsx',
    'src/components/social/ReportSheet.tsx',
    'src/components/social/SaveToCollectionSheet.tsx',
    'src/components/social/ShareToDM.tsx',
    'src/components/social/StoryViewer.tsx',
    'src/components/social/TipSheet.tsx',
    'src/components/wallet/CreatorEarnings.tsx',
    'src/contexts/CallProvider.tsx'
]

for t in targets:
    if os.path.exists(t):
        fix_file(t)

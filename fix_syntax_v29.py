import os

def replace_lines(path, start_line, end_line, new_text):
    if not os.path.exists(path): return
    with open(path, 'r') as f:
        lines = f.readlines()
    
    # adjust for 1-based indexing
    s = start_line - 1
    e = end_line
    
    lines[s:e] = [new_text + '\n']
    
    with open(path, 'w') as f:
        f.writelines(lines)

# 1. StoryViewer - fix react function and story view record
replace_lines('src/components/social/StoryViewer.tsx', 54, 59, 
'''  const react = async (emoji: string) => {
    if (!user) return toast.error("Sign in");
    const { error } = await supabase.from("story_reactions").insert({
      story_id: current.id, user_id: user.uid, emoji
    });
    if (error) toast.error(error.message); else toast.success(`Reacted ${emoji}`);
  };''')

# 2. TipSheet - fix startPay function
replace_lines('src/components/social/TipSheet.tsx', 68, 73,
'''    try {
      const { data, error } = await supabase.rpc("init_tip_payment", {
        _recipient_id: recipientId,
        _amount_cents: cents,
        _post_id: postId ?? null,
        _message: message.trim() || null
      });''')

# 3. CreatorEarnings - fix kyc insert
replace_lines('src/components/wallet/CreatorEarnings.tsx', 121, 131,
'''      const [idPath, pbPath] = await Promise.all([upload(idFile, "id"), upload(pbFile, "passbook")]);
      const { error } = await supabase.from("creator_kyc").insert({
        user_id: user.uid,
        full_name: fullName.trim(),
        pan_number: pan.trim().toUpperCase(),
        bank_account_number: acct.trim(),
        bank_ifsc: ifsc.trim().toUpperCase(),
        bank_name: bankName.trim() || null,
        id_photo_url: idPath,
        passbook_photo_url: pbPath,
      });''')

# 4. CallProvider - fix summaries and signals
replace_lines('src/contexts/CallProvider.tsx', 106, 107, '      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.uid, content: label });')
replace_lines('src/contexts/CallProvider.tsx', 115, 118, '''          status: finalStatus,
          ended_at: new Date().toISOString(),
          duration_sec: finalStatus === "ended" ? dur : 0
        }).eq("id", a.call_id);''')
replace_lines('src/contexts/CallProvider.tsx', 130, 131, '      await supabase.from("call_signals").insert({ call_id: callId, from_user: user.uid, to_user: toUser, kind, payload });')

# 5. ContentQueue - fix classifications
replace_lines('src/features/content-understanding/hooks/useContentQueue.ts', 28, 35, '''        human_review_status: input.status,
        human_review_required: false,
        primary_category_id: input.categoryId || null,
        classified_by: u.user?.uid,
        classified_at: new Date().toISOString(),
        notes: input.notes,
        updated_at: new Date().toISOString()
      }).eq("id", input.id);''')

# 6. Compose - fix collaborator invites
replace_lines('src/pages/Compose.tsx', 161, 163, '''      if (newId && collabs.length) {
        await supabase.from("post_collaborators").insert(collabs.map((c) => ({ post_id: newId, user_id: c.user_id })));
      }''')

# 7. EditProfile - fix bio rewrite call
replace_lines('src/pages/EditProfile.tsx', 30, 31, '      const { data, error } = await supabase.functions.invoke("rewrite-bio", { body: { bio: bio.trim() } });')

# 8. Assistant - fix fetch call
replace_lines('src/pages/Assistant.tsx', 48, 49, '        body: JSON.stringify({ messages: next, model: "gpt-4o" }),\n      });')

# 9. cardThemes - fix limited theme trailing brace
replace_lines('src/components/wallet-os/cardThemes.ts', 100, 107,
'''  limited: {
    label: "Limited Edition",
    surface: "linear-gradient(145deg,#1c0f0a 0%,#0a0605 50%,#2a1610 100%)",
    glow: "radial-gradient(120% 90% at 80% 0%, rgba(251,146,60,0.32), transparent 60%)",
    sheen: "linear-gradient(115deg, transparent 30%, rgba(254,215,170,0.26) 46%, transparent 62%)",
    edge: "rgba(251,146,60,0.48)",
    accent: "#fdba74",
    finish: "metal"
  },''')


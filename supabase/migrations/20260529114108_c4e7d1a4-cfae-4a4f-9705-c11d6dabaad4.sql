
do $$
declare fn text;
begin
  foreach fn in array array[
    'handle_new_user()','posts_count_trg()','follows_count_trg()','likes_count_trg()',
    'comments_count_trg()','bump_conversation_trg()','notify_like_trg()',
    'notify_comment_trg()','notify_follow_trg()','set_updated_at()'
  ] loop
    execute format('revoke execute on function public.%s from anon, authenticated', fn);
  end loop;
end $$;


alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.posts_count_trg() from public;
revoke execute on function public.follows_count_trg() from public;
revoke execute on function public.likes_count_trg() from public;
revoke execute on function public.comments_count_trg() from public;
revoke execute on function public.bump_conversation_trg() from public;
revoke execute on function public.notify_like_trg() from public;
revoke execute on function public.notify_comment_trg() from public;
revoke execute on function public.notify_follow_trg() from public;
revoke execute on function public.set_updated_at() from public;

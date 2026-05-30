
-- 1) Attach handle_new_user trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2) Backfill missing profiles for existing users
insert into public.profiles (user_id, username, display_name, avatar_url)
select
  u.id,
  -- unique-ish username: base + short id suffix to avoid collisions
  lower(regexp_replace(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'))
    || substr(replace(u.id::text, '-', ''), 1, 6),
  coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User'),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

-- 3) Add FKs from user-referencing columns to public.profiles(user_id)
--    so PostgREST can embed `profiles(...)` directly.
alter table public.posts
  add constraint posts_user_profile_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

alter table public.comments
  add constraint comments_user_profile_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

alter table public.likes
  add constraint likes_user_profile_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

alter table public.follows
  add constraint follows_follower_profile_fkey
  foreign key (follower_id) references public.profiles(user_id) on delete cascade;

alter table public.follows
  add constraint follows_following_profile_fkey
  foreign key (following_id) references public.profiles(user_id) on delete cascade;

alter table public.notifications
  add constraint notifications_actor_profile_fkey
  foreign key (actor_id) references public.profiles(user_id) on delete set null;

alter table public.conversation_participants
  add constraint conv_participants_user_profile_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

alter table public.messages
  add constraint messages_sender_profile_fkey
  foreign key (sender_id) references public.profiles(user_id) on delete cascade;

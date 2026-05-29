
-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";

-- ============ UTILITY: updated_at ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  avatar_url text,
  cover_url text,
  bio text default '',
  verified boolean not null default false,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  posts_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  n int := 0;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then base_username := base_username || substr(replace(new.id::text, '-', ''), 1, 6); end if;
  final_username := base_username;
  while exists(select 1 from public.profiles where username = final_username) loop
    n := n + 1;
    final_username := base_username || n::text;
  end loop;
  insert into public.profiles (user_id, username, display_name, avatar_url)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', final_username), new.raw_user_meta_data->>'avatar_url');
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ POSTS ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_url text,
  media_type text check (media_type in ('image','video') or media_type is null),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);
create trigger posts_updated before update on public.posts
  for each row execute function public.set_updated_at();
create index posts_user_created_idx on public.posts(user_id, created_at desc);
create index posts_created_idx on public.posts(created_at desc);

create or replace function public.posts_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where user_id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where user_id = old.user_id;
  end if;
  return null;
end; $$;
create trigger posts_count_after after insert or delete on public.posts
  for each row execute function public.posts_count_trg();

-- ============ FOLLOWS ============
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);
create index follows_following_idx on public.follows(following_id);

create or replace function public.follows_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where user_id = new.following_id;
    update public.profiles set following_count = following_count + 1 where user_id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where user_id = old.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where user_id = old.follower_id;
  end if;
  return null;
end; $$;
create trigger follows_count_after after insert or delete on public.follows
  for each row execute function public.follows_count_trg();

-- ============ LIKES ============
create table public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
grant select on public.likes to anon, authenticated;
grant insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "likes_select_all" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);
create index likes_post_idx on public.likes(post_id);

create or replace function public.likes_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
create trigger likes_count_after after insert or delete on public.likes
  for each row execute function public.likes_count_trg();

-- ============ COMMENTS ============
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);
create index comments_post_idx on public.comments(post_id, created_at desc);

create or replace function public.comments_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
create trigger comments_count_after after insert or delete on public.comments
  for each row execute function public.comments_count_trg();

-- ============ CONVERSATIONS / MESSAGES ============
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
grant select, insert, update on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
grant select, insert, delete on public.conversation_participants to authenticated;
grant all on public.conversation_participants to service_role;
alter table public.conversation_participants enable row level security;

-- Security definer helper to avoid RLS recursion
create or replace function public.is_conversation_member(_conv uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_participants where conversation_id = _conv and user_id = _user);
$$;

create policy "conversations_select_member" on public.conversations for select
  using (public.is_conversation_member(id, auth.uid()));
create policy "conversations_insert_auth" on public.conversations for insert
  with check (auth.uid() is not null);
create policy "conversations_update_member" on public.conversations for update
  using (public.is_conversation_member(id, auth.uid()));

create policy "participants_select_member" on public.conversation_participants for select
  using (public.is_conversation_member(conversation_id, auth.uid()) or user_id = auth.uid());
create policy "participants_insert_self_or_member" on public.conversation_participants for insert
  with check (auth.uid() is not null and (user_id = auth.uid() or public.is_conversation_member(conversation_id, auth.uid())));
create policy "participants_delete_self" on public.conversation_participants for delete
  using (user_id = auth.uid());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create index messages_conv_created_idx on public.messages(conversation_id, created_at desc);

create policy "messages_select_member" on public.messages for select
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "messages_insert_member" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid()));
create policy "messages_update_member" on public.messages for update
  using (public.is_conversation_member(conversation_id, auth.uid()));

create or replace function public.bump_conversation_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return null;
end; $$;
create trigger messages_bump_conv after insert on public.messages
  for each row execute function public.bump_conversation_trg();

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('like','comment','follow','message','mention')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());

-- Auto-create notifications
create or replace function public.notify_like_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (owner, new.user_id, 'like', new.post_id);
  end if;
  return null;
end; $$;
create trigger likes_notify after insert on public.likes
  for each row execute function public.notify_like_trg();

create or replace function public.notify_comment_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
    values (owner, new.user_id, 'comment', new.post_id, new.id);
  end if;
  return null;
end; $$;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment_trg();

create or replace function public.notify_follow_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return null;
end; $$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_follow_trg();

-- ============ REALTIME ============
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('post-media', 'post-media', true) on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_user_write" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_user_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_user_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "postmedia_public_read" on storage.objects for select using (bucket_id = 'post-media');
create policy "postmedia_user_write" on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "postmedia_user_update" on storage.objects for update
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "postmedia_user_delete" on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

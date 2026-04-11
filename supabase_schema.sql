-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  age integer not null check (age >= 18 and age <= 35),
  bio text,
  faculty text not null,
  university text not null,
  city text not null,
  gender text not null check (gender in ('moški', 'ženska', 'drugo')),
  photos text[] not null default '{}',
  is_onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profile swipes table (discovery like/dislike actions)
create table public.profile_swipes (
  id uuid primary key default uuid_generate_v4(),
  swiper_id uuid references public.profiles(id) on delete cascade not null,
  swiped_id uuid references public.profiles(id) on delete cascade not null,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  unique(swiper_id, swiped_id)
);

-- Buddy matches table (mutual swipe pairings)
create table public.buddy_matches (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user1_id, user2_id)
);

-- Meal invites table (food meetup proposals)
create table public.meal_invites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.buddy_matches(id) on delete cascade,
  restaurant text not null,
  scheduled_at timestamptz not null,
  note text,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'done')),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  constraint meal_invites_visibility_match_chk check (
    (visibility = 'private' and match_id is not null)
    or (visibility = 'public' and match_id is null)
  )
);

create index meal_invites_public_idx
  on public.meal_invites (created_at desc)
  where visibility = 'public' and status = 'open';

-- Chat messages table (buddy chat messages)
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references public.buddy_matches(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Blocked users table
create table public.blocked_users (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

-- Restaurants table (data scraped from studentska-prehrana.si)
create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  sp_id integer unique,
  name text not null,
  city text,
  address text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  supplement_price numeric(5,2),
  meal_price numeric(5,2),
  rating integer,
  features text[],
  phone text,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on profiles
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- Function: create match when both users swipe right on each other
create or replace function check_and_create_match()
returns trigger as $$
declare
  other_swipe_exists boolean;
  p1 uuid;
  p2 uuid;
begin
  if new.direction = 'right' then
    select exists(
      select 1 from public.profile_swipes
      where swiper_id = new.swiped_id
        and swiped_id = new.swiper_id
        and direction = 'right'
    ) into other_swipe_exists;

    if other_swipe_exists then
      if new.swiper_id < new.swiped_id then
        p1 := new.swiper_id;
        p2 := new.swiped_id;
      else
        p1 := new.swiped_id;
        p2 := new.swiper_id;
      end if;

      insert into public.buddy_matches (user1_id, user2_id)
      values (p1, p2)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger swipe_match_trigger
  after insert or update on public.profile_swipes
  for each row execute function check_and_create_match();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.profile_swipes enable row level security;
alter table public.buddy_matches enable row level security;
alter table public.meal_invites enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id);

-- Profile swipes policies
create policy "Users can view their own swipes"
  on public.profile_swipes for select
  to authenticated
  using (swiper_id = (select id from public.profiles where user_id = auth.uid()));

create policy "Users can insert their own swipes"
  on public.profile_swipes for insert
  to authenticated
  with check (swiper_id = (select id from public.profiles where user_id = auth.uid()));

create policy "Users can update their own swipes"
  on public.profile_swipes for update
  to authenticated
  using (swiper_id = (select id from public.profiles where user_id = auth.uid()))
  with check (swiper_id = (select id from public.profiles where user_id = auth.uid()));

-- Buddy matches policies
create policy "Users can view their buddy matches"
  on public.buddy_matches for select
  to authenticated
  using (
    user1_id = (select id from public.profiles where user_id = auth.uid())
    or user2_id = (select id from public.profiles where user_id = auth.uid())
  );

-- Meal invites policies
create policy "Meal invite visibility"
  on public.meal_invites for select
  to authenticated
  using (
    visibility = 'public'
    or user_id = (select id from public.profiles where user_id = auth.uid())
    or match_id in (
      select id from public.buddy_matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

create policy "Anon can view open public meal invites"
  on public.meal_invites for select
  to anon
  using (visibility = 'public' and status = 'open');

create policy "Users can create meal invites"
  on public.meal_invites for insert
  to authenticated
  with check (user_id = (select id from public.profiles where user_id = auth.uid()));

create policy "Users can update their own meal invites"
  on public.meal_invites for update
  to authenticated
  using (user_id = (select id from public.profiles where user_id = auth.uid()));

-- Chat messages policies
create policy "Users can view chat messages"
  on public.chat_messages for select
  to authenticated
  using (
    match_id in (
      select id from public.buddy_matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

create policy "Users can send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = (select id from public.profiles where user_id = auth.uid())
    and match_id in (
      select id from public.buddy_matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

-- Storage bucket for profile photos (run this separately in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

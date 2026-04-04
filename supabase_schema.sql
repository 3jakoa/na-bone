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

-- Swipes table
create table public.swipes (
  id uuid primary key default uuid_generate_v4(),
  swiper_id uuid references public.profiles(id) on delete cascade not null,
  swiped_id uuid references public.profiles(id) on delete cascade not null,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  unique(swiper_id, swiped_id)
);

-- Matches table
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user1_id, user2_id)
);

-- Bones table (food invites)
create table public.bones (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade,
  restaurant text not null,
  scheduled_at timestamptz not null,
  note text,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'done')),
  created_at timestamptz not null default now()
);

-- Messages table
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references public.matches(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
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
      select 1 from public.swipes
      where swiper_id = new.swiped_id
        and swiped_id = new.swiper_id
        and direction = 'right'
    ) into other_swipe_exists;

    if other_swipe_exists then
      -- Canonical order so unique constraint doesn't get violated
      if new.swiper_id < new.swiped_id then
        p1 := new.swiper_id;
        p2 := new.swiped_id;
      else
        p1 := new.swiped_id;
        p2 := new.swiper_id;
      end if;

      insert into public.matches (user1_id, user2_id)
      values (p1, p2)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger swipe_match_trigger
  after insert on public.swipes
  for each row execute function check_and_create_match();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.bones enable row level security;
alter table public.messages enable row level security;

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

-- Swipes policies
create policy "Users can view their own swipes"
  on public.swipes for select
  to authenticated
  using (swiper_id = (select id from public.profiles where user_id = auth.uid()));

create policy "Users can insert their own swipes"
  on public.swipes for insert
  to authenticated
  with check (swiper_id = (select id from public.profiles where user_id = auth.uid()));

-- Matches policies
create policy "Users can view their own matches"
  on public.matches for select
  to authenticated
  using (
    user1_id = (select id from public.profiles where user_id = auth.uid())
    or user2_id = (select id from public.profiles where user_id = auth.uid())
  );

-- Bones policies
create policy "Users can view bones in their matches"
  on public.bones for select
  to authenticated
  using (
    match_id in (
      select id from public.matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
    or user_id = (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can insert bones for their matches"
  on public.bones for insert
  to authenticated
  with check (user_id = (select id from public.profiles where user_id = auth.uid()));

create policy "Users can update their own bones"
  on public.bones for update
  to authenticated
  using (user_id = (select id from public.profiles where user_id = auth.uid()));

-- Messages policies
create policy "Users can view messages in their matches"
  on public.messages for select
  to authenticated
  using (
    match_id in (
      select id from public.matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

create policy "Users can send messages in their matches"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select id from public.profiles where user_id = auth.uid())
    and match_id in (
      select id from public.matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

-- Storage bucket for profile photos (run this separately in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

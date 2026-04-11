-- Add education_level column if it doesn't exist
alter table public.profiles add column if not exists education_level text check (education_level in ('dodiplomski', 'magistrski', 'doktorski'));

-- Add visibility column to bones if missing
DO $$ BEGIN
  alter table public.bones add column visibility text not null default 'public' check (visibility in ('public', 'private'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update bones select policy to include public bones
drop policy if exists "Users can view bones in their matches" on public.bones;
drop policy if exists "Users can view bones" on public.bones;
create policy "Users can view bones"
  on public.bones for select
  to authenticated
  using (
    visibility = 'public'
    or user_id = (select id from public.profiles where user_id = auth.uid())
    or match_id in (
      select id from public.matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

-- Create restaurants table if not exists
create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  city text,
  created_at timestamptz not null default now()
);

alter table public.restaurants enable row level security;

drop policy if exists "Restaurants viewable by authenticated" on public.restaurants;
create policy "Restaurants viewable by authenticated" on public.restaurants for select to authenticated using (true);

drop policy if exists "Authenticated can insert restaurants" on public.restaurants;
create policy "Authenticated can insert restaurants" on public.restaurants for insert to authenticated with check (true);

-- Seed restaurants
insert into public.restaurants (name, city) values
  ('FRI menza', 'Ljubljana'),
  ('Rožna dolina menza', 'Ljubljana'),
  ('BF menza', 'Ljubljana'),
  ('FE menza', 'Ljubljana'),
  ('Menza na Kardeljevi', 'Ljubljana'),
  ('ŠOU menza', 'Ljubljana'),
  ('Slorest', 'Ljubljana'),
  ('Deli', 'Ljubljana'),
  ('Hana', 'Ljubljana'),
  ('Kompot', 'Ljubljana'),
  ('Kodila', 'Ljubljana'),
  ('Figovec', 'Ljubljana'),
  ('Pop''s Place', 'Ljubljana'),
  ('Hood Burger', 'Ljubljana'),
  ('Nobel Burek', 'Ljubljana'),
  ('Falafel Ljubljana', 'Ljubljana'),
  ('Olimpija', 'Ljubljana'),
  ('TaBar', 'Ljubljana'),
  ('Stari Pisker', 'Maribor'),
  ('Menza UM', 'Maribor'),
  ('Menza UP', 'Koper')
on conflict (name) do nothing;

-- Create dummy auth users first (required for FK constraint)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.novak@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'luka.krajnc@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maja.zupancic@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nik.horvat@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eva.potocnik@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jan.kos@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tina.vidmar@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zan.mlakar@student.um.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sara.kovac@student.um.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'miha.golob@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pia.turk@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('b1000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rok.oblak@student.uni-lj.si', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

-- Now insert profiles
insert into public.profiles (id, user_id, name, age, bio, faculty, university, city, gender, education_level, photos, is_onboarded) values
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Ana Novak', 22, 'Rada berem in pijem kavo. Iščem kosilo buddyja!', 'Fakulteta za računalništvo in informatiko', 'Univerza v Ljubljani', 'Ljubljana', 'ženska', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/women/1.jpg', 'https://randomuser.me/api/portraits/women/11.jpg'], true),
  ('a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Luka Krajnc', 23, 'FRI študent. Burek > vse.', 'Fakulteta za računalništvo in informatiko', 'Univerza v Ljubljani', 'Ljubljana', 'moški', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/men/2.jpg', 'https://randomuser.me/api/portraits/men/12.jpg'], true),
  ('a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'Maja Zupančič', 21, 'Ekonomistka s slabostjo za sushi.', 'Ekonomska fakulteta', 'Univerza v Ljubljani', 'Ljubljana', 'ženska', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/women/3.jpg', 'https://randomuser.me/api/portraits/women/13.jpg', 'https://randomuser.me/api/portraits/women/23.jpg'], true),
  ('a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'Nik Horvat', 25, 'Magistrski študent strojništva. Vedno lačen.', 'Fakulteta za strojništvo', 'Univerza v Ljubljani', 'Ljubljana', 'moški', 'magistrski', ARRAY['https://randomuser.me/api/portraits/men/4.jpg'], true),
  ('a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'Eva Potočnik', 20, 'Pravo, kavica in kosilo na bonu.', 'Pravna fakulteta', 'Univerza v Ljubljani', 'Ljubljana', 'ženska', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/women/5.jpg', 'https://randomuser.me/api/portraits/women/15.jpg'], true),
  ('a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'Jan Kos', 24, 'Doktorand fizike. Rad kuham ampak boni so cenejši.', 'Fakulteta za matematiko in fiziko', 'Univerza v Ljubljani', 'Ljubljana', 'moški', 'doktorski', ARRAY['https://randomuser.me/api/portraits/men/6.jpg', 'https://randomuser.me/api/portraits/men/16.jpg'], true),
  ('a1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000007', 'Tina Vidmar', 22, 'Arhitektura + kava = moje življenje', 'Fakulteta za arhitekturo', 'Univerza v Ljubljani', 'Ljubljana', 'ženska', 'magistrski', ARRAY['https://randomuser.me/api/portraits/women/7.jpg'], true),
  ('a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000008', 'Žan Mlakar', 21, 'FERI študent iz Maribora. Pizza lover.', 'Fakulteta za elektrotehniko, računalništvo in informatiko', 'Univerza v Mariboru', 'Maribor', 'moški', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/men/8.jpg', 'https://randomuser.me/api/portraits/men/18.jpg'], true),
  ('a1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000009', 'Sara Kovač', 23, 'Medicinska študentka. Potrebujem fuel za učenje!', 'Medicinska fakulteta', 'Univerza v Mariboru', 'Maribor', 'ženska', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/women/9.jpg', 'https://randomuser.me/api/portraits/women/19.jpg', 'https://randomuser.me/api/portraits/women/29.jpg'], true),
  ('a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000010', 'Miha Golob', 26, 'Doktorand kemije. Eksperimenti v kuhinji in v labu.', 'Fakulteta za kemijo in kemijsko tehnologijo', 'Univerza v Ljubljani', 'Ljubljana', 'moški', 'doktorski', ARRAY['https://randomuser.me/api/portraits/men/10.jpg'], true),
  ('a1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000011', 'Pia Turk', 20, 'Filozofija in dobra hrana. What more do you need?', 'Filozofska fakulteta', 'Univerza v Ljubljani', 'Ljubljana', 'ženska', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/women/21.jpg', 'https://randomuser.me/api/portraits/women/31.jpg'], true),
  ('a1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000012', 'Rok Oblak', 22, 'BF študent. Poznam vsako menzo v LJ.', 'Biotehniška fakulteta', 'Univerza v Ljubljani', 'Ljubljana', 'moški', 'dodiplomski', ARRAY['https://randomuser.me/api/portraits/men/22.jpg', 'https://randomuser.me/api/portraits/men/32.jpg'], true)
on conflict (user_id) do nothing;

-- Create some bones (posts)
insert into public.bones (user_id, restaurant, scheduled_at, note, status, visibility) values
  ('a1000000-0000-0000-0000-000000000001', 'FRI menza', now() + interval '2 hours', 'Kdo gre na kosilo? Čakam pred FRI.', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000002', 'Hood Burger', now() + interval '3 hours', 'Burger za kosilo, kdo je noter?', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000003', 'Slorest', now() + interval '1 hour', null, 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000004', 'Kompot', now() + interval '4 hours', 'Jem sam, raje bi mel družbo!', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000006', 'Figovec', now() + interval '2 hours', 'Fiziki gremo na pivo in kosilo', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000008', 'Stari Pisker', now() + interval '1 hour', 'Maribor ekipa, kdo pride?', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000009', 'Menza UM', now() + interval '3 hours', 'Pavza od učenja, gremo jest!', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000011', 'Nobel Burek', now() + interval '30 minutes', 'Burek emergency! Kdo se pridruži?', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000012', 'Rožna dolina menza', now() + interval '5 hours', 'Večerja v Rožni, mesto za 2.', 'open', 'public'),
  ('a1000000-0000-0000-0000-000000000005', 'Deli', now() + interval '2 hours', 'Zdrava hrana za spremembo', 'open', 'public');

-- Make sure avatars storage bucket exists and is public
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Storage policy for avatars
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload avatars" on storage.objects;
create policy "Users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

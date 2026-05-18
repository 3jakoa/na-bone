drop policy if exists "Avatar delete" on storage.objects;
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Avatar insert" on storage.objects;
drop policy if exists "Avatar read" on storage.objects;
drop policy if exists "Avatar update" on storage.objects;
drop policy if exists "Avatars are publicly viewable" on storage.objects;
drop policy if exists "Users can delete their own avatars" on storage.objects;
drop policy if exists "Users can update their avatars" on storage.objects;
drop policy if exists "Users can upload avatars" on storage.objects;
drop policy if exists "Users can upload their own avatars" on storage.objects;

create policy "Avatars are publicly viewable"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "Users can upload their own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

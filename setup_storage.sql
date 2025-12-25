-- Create a storage bucket for lead attachments
insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket
-- Allow authenticated users to upload files
create policy "Authenticated users can upload lead attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'lead-attachments'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own files (optional, but good)
create policy "Authenticated users can update lead attachments"
  on storage.objects for update
  using (
    bucket_id = 'lead-attachments'
    and auth.role() = 'authenticated'
  );

-- Allow anyone to view files (since it's a public bucket, strictly speaking we need SELECT policy too)
-- But for public buckets, usually it's open. However, RLS on storage.objects might block listing.
-- Let's allow authenticated users to select/download
create policy "Authenticated users can select lead attachments"
  on storage.objects for select
  using (
    bucket_id = 'lead-attachments'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files
create policy "Authenticated users can delete lead attachments"
  on storage.objects for delete
  using (
    bucket_id = 'lead-attachments'
    and auth.role() = 'authenticated'
  );

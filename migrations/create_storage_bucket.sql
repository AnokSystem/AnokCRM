-- Create a new storage bucket for flow media
INSERT INTO storage.buckets (id, name, public)
VALUES ('flow-media', 'flow-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to view files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'flow-media' );

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'flow-media'
  AND auth.role() = 'authenticated'
);

-- Policy to allow users to update/delete their own files (optional, but good practice)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'flow-media'
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'flow-media'
  AND auth.uid() = owner
);

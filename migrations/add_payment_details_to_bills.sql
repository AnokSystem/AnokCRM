-- Migration to add payment details to bills table
-- Also creates a storage bucket for bill attachments

-- 1. Add columns to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('money', 'pix', 'card', 'deposit', 'transfer', 'other')),
ADD COLUMN IF NOT EXISTS bank TEXT,
ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 2. Create storage bucket for bill attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-attachments', 'bill-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
-- Public access to view files (signed URLs preferred but public is easier for MVP)
CREATE POLICY "Public Access Bill Attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'bill-attachments' );

-- Authenticated upload
CREATE POLICY "Authenticated Upload Bill Attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bill-attachments'
  AND auth.role() = 'authenticated'
);

-- Users can delete their own files
CREATE POLICY "Users can delete own bill attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bill-attachments'
  AND auth.uid() = owner
);

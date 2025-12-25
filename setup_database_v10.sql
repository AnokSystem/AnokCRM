-- Setup Database V10 - WhatsApp Instance Isolation

-- Create table to track WhatsApp instances per user
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(instance_name)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS whatsapp_instances_user_id_idx ON public.whatsapp_instances(user_id);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_instances
DROP POLICY IF EXISTS "Users can view own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can create own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Admins can view all instances" ON public.whatsapp_instances;

CREATE POLICY "Users can view own instances"
  ON public.whatsapp_instances FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can create own instances"
  ON public.whatsapp_instances FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can delete own instances"
  ON public.whatsapp_instances FOR DELETE
  USING ( auth.uid() = user_id );

CREATE POLICY "Admins can view all instances"
  ON public.whatsapp_instances FOR SELECT
  USING ( public.is_admin() );

COMMENT ON TABLE public.whatsapp_instances IS 'Maps WhatsApp Evolution API instances to users for multi-tenant isolation';
COMMENT ON COLUMN public.whatsapp_instances.instance_name IS 'Name of the instance in Evolution API';
COMMENT ON COLUMN public.whatsapp_instances.user_id IS 'Owner of this WhatsApp instance';

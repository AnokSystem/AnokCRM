-- Setup Database V11 - Unique Instance Names with Display Names

-- Add display_name column to separate user-facing name from API name
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Migrate existing data: copy instance_name to display_name for existing records
UPDATE public.whatsapp_instances SET display_name = instance_name WHERE display_name IS NULL;

-- Make display_name NOT NULL after migration
ALTER TABLE public.whatsapp_instances ALTER COLUMN display_name SET NOT NULL;

COMMENT ON COLUMN public.whatsapp_instances.display_name IS 'User-friendly name shown in the UI';
COMMENT ON COLUMN public.whatsapp_instances.instance_name IS 'Unique technical name used in Evolution API (auto-generated)';

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    empresa_nome TEXT,
    empresa_cnpj TEXT,
    empresa_logo_base64 TEXT,
    empresa_endereco TEXT,
    empresa_telefone TEXT,
    empresa_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own organization settings"
    ON organization_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization settings"
    ON organization_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization settings"
    ON organization_settings FOR UPDATE
    USING (auth.uid() = user_id);

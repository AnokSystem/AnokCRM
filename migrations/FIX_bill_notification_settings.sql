-- =====================================================
-- FIX: Verificar e Corrigir Tabela de Notificações
-- =====================================================
-- Execute este SQL para diagnosticar e corrigir o problema

-- 1. Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'bill_notification_settings'
);

-- 2. Verificar as colunas da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bill_notification_settings';

-- 3. Se a tabela não tiver as colunas corretas, delete e recrie
DROP TABLE IF EXISTS bill_notification_settings CASCADE;

-- 4. Recriar tabela com estrutura correta
CREATE TABLE bill_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- WhatsApp Configuration
    whatsapp_instance TEXT,
    notification_phone TEXT NOT NULL,
    
    -- Notification Toggles
    notify_1day_before BOOLEAN DEFAULT true,
    notify_on_due_date BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one config per user
    UNIQUE(user_id)
);

-- 5. Criar índice
CREATE INDEX idx_bill_notification_settings_user ON bill_notification_settings(user_id);

-- 6. Habilitar RLS
ALTER TABLE bill_notification_settings ENABLE ROW LEVEL SECURITY;

-- 7. Criar policy
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON bill_notification_settings;
CREATE POLICY "Users can manage their own notification settings"
    ON bill_notification_settings FOR ALL
    USING (auth.uid() = user_id);

-- 8. Criar trigger de update
CREATE OR REPLACE FUNCTION update_bill_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bill_notification_settings_updated_at_trigger ON bill_notification_settings;
CREATE TRIGGER bill_notification_settings_updated_at_trigger
    BEFORE UPDATE ON bill_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_notification_settings_timestamp();

-- Verificar se criou corretamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bill_notification_settings'
ORDER BY ordinal_position;

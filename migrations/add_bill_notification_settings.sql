-- Configurações de Notificações de Contas
-- Permite que o usuário configure onde receber lembretes de vencimento

CREATE TABLE IF NOT EXISTS bill_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- WhatsApp Configuration
    whatsapp_instance TEXT, -- Nome da instância Evolution API
    notification_phone TEXT NOT NULL, -- Telefone que receberá as notificações
    
    -- Notification Preferences
    notify_1d_before BOOLEAN DEFAULT TRUE, -- Notificar 1 dia antes
    notify_on_due_date BOOLEAN DEFAULT TRUE, -- Notificar no dia do vencimento
    notify_overdue BOOLEAN DEFAULT FALSE, -- Notificar após vencimento
    
    -- Timing
    notification_time TIME DEFAULT '09:00:00', -- Horário para enviar notificações
    
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE bill_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification settings"
    ON bill_notification_settings FOR ALL
    USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_bill_notification_settings_user ON bill_notification_settings(user_id);

-- Trigger para updated_at
CREATE TRIGGER bill_notification_settings_updated_at_trigger
    BEFORE UPDATE ON bill_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_bills_updated_at(); -- Reutiliza função já criada

COMMENT ON TABLE bill_notification_settings IS 'Configurações de notificações de contas a pagar por usuário';

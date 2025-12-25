-- Adicionar configuração de webhook de notificações de contas
-- (A tabela system_settings já existe)

INSERT INTO system_settings (key, description) VALUES
    ('bills_notification_webhook_url', 'URL do webhook N8N para notificações de vencimento de contas')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- MIGRATION: Subscription Management System
-- Adiciona controle de assinaturas na tabela user_plans
-- =====================================================

-- 1. Adicionar colunas de controle de assinatura
ALTER TABLE user_plans
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- 2. Adicionar comentários nas colunas
COMMENT ON COLUMN user_plans.subscription_start_date IS 'Data de início da assinatura atual';
COMMENT ON COLUMN user_plans.subscription_end_date IS 'Data de vencimento da assinatura (30 dias após início)';
COMMENT ON COLUMN user_plans.status IS 'Status: active, pending_payment, expired, cancelled';
COMMENT ON COLUMN user_plans.last_payment_date IS 'Data do último pagamento confirmado';
COMMENT ON COLUMN user_plans.payment_link IS 'Link de pagamento para renovação';

-- 3. Atualizar registros existentes
UPDATE user_plans 
SET 
    subscription_start_date = COALESCE(subscription_start_date, NOW()),
    subscription_end_date = COALESCE(subscription_end_date, NOW() + INTERVAL '30 days'),
    status = COALESCE(status, 'active')
WHERE subscription_end_date IS NULL OR status IS NULL;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_plans_end_date 
ON user_plans(subscription_end_date);

CREATE INDEX IF NOT EXISTS idx_user_plans_status 
ON user_plans(status);

CREATE INDEX IF NOT EXISTS idx_user_plans_status_end_date 
ON user_plans(status, subscription_end_date);

-- 5. Verificar resultados
SELECT 
    user_id,
    status,
    subscription_start_date,
    subscription_end_date,
    EXTRACT(DAY FROM (subscription_end_date - NOW())) as days_remaining
FROM user_plans
ORDER BY subscription_end_date
LIMIT 10;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- Execute este script no SQL Editor do Supabase
-- =====================================================

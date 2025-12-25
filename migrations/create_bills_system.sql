-- =====================================================
-- Sistema de Contas a Pagar (Bills Management System)
-- =====================================================
-- Criado: 2025-12-22
-- Versão: MVP 1.0
-- =====================================================

-- 1. Tabela de Categorias de Contas
CREATE TABLE IF NOT EXISTS bill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1', -- Cor para UI (hex)
    icon TEXT DEFAULT 'DollarSign', -- Nome do ícone Lucide
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, name) -- Não permitir categorias duplicadas
);

-- 2. Tabela Principal de Contas
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informações Básicas
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    
    -- Datas
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    
    -- Status e Tipo
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')) DEFAULT 'one_time',
    
    -- Recorrência (apenas para type = 'recurring')
    recurrence_pattern TEXT CHECK (recurrence_pattern IN ('monthly', 'quarterly', 'yearly')),
    recurrence_day INTEGER CHECK (recurrence_day BETWEEN 1 AND 31), -- Dia do mês para recorrência
    
    -- Relacionamentos
    category_id UUID REFERENCES bill_categories(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL, -- Vincular a campanha (opcional)
    
    -- Anexos e Notas
    attachment_url TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Histórico de Notificações
CREATE TABLE IF NOT EXISTS bill_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder_1d', 'reminder_due', 'reminder_overdue')),
    sent_at TIMESTAMPTZ DEFAULT now(),
    whatsapp_instance TEXT,
    phone TEXT -- Telefone do usuário que recebeu
);

-- 4. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_user_status_due ON bills(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_bill_notifications_bill ON bill_notifications(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_categories_user ON bill_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_notifications_sent_at ON bill_notifications(sent_at);

-- Nota: Prevenção de duplicatas de notificações no mesmo dia é feita na aplicação
-- (ver scripts/send_bill_notifications.js linha ~95)

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bills_updated_at_trigger
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_bills_updated_at();

-- 6. Trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se foi marcada como paga
    IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL THEN
        NEW.status = 'paid';
    END IF;
    
    -- Se está pendente e venceu
    IF NEW.status = 'pending' AND NEW.due_date < CURRENT_DATE THEN
        NEW.status = 'overdue';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bill_status_trigger
    BEFORE INSERT OR UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_status();

-- 7. Enable RLS (Row Level Security)
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_notifications ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
CREATE POLICY "Users can manage their own bills"
    ON bills FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bill categories"
    ON bill_categories FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bill notifications"
    ON bill_notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bills
            WHERE bills.id = bill_notifications.bill_id
            AND bills.user_id = auth.uid()
        )
    );

-- 9. Seed Categorias Padrão (opcional - executar apenas uma vez por usuário)
-- Comentado para não inserir automaticamente
-- INSERT INTO bill_categories (user_id, name, color, icon) 
-- SELECT id, 'Marketing', '#ef4444', 'TrendingUp' FROM auth.users
-- ON CONFLICT DO NOTHING;

-- 10. Comentários para Documentação
COMMENT ON TABLE bills IS 'Contas a pagar do usuário';
COMMENT ON COLUMN bills.type IS 'one_time = conta única, recurring = conta recorrente';
COMMENT ON COLUMN bills.recurrence_pattern IS 'Padrão de recorrência: monthly, quarterly, yearly';
COMMENT ON COLUMN bills.recurrence_day IS 'Dia do mês para renovar a conta (1-31)';
COMMENT ON COLUMN bills.status IS 'pending = pendente, paid = paga, overdue = atrasada';

COMMENT ON TABLE bill_notifications IS 'Histórico de notificações enviadas via WhatsApp';
COMMENT ON COLUMN bill_notifications.notification_type IS 'reminder_1d = 1 dia antes, reminder_due = dia do vencimento, reminder_overdue = após vencimento';

-- =====================================================
-- Queries Úteis para Testes
-- =====================================================

-- Buscar contas que vencem amanhã (para notificações D-1)
-- SELECT * FROM bills 
-- WHERE status = 'pending' 
-- AND due_date = CURRENT_DATE + INTERVAL '1 day'
-- AND user_id = '<USER_ID>';

-- Buscar contas que vencem hoje (para notificações do dia)
-- SELECT * FROM bills 
-- WHERE status = 'pending' 
-- AND due_date = CURRENT_DATE
-- AND user_id = '<USER_ID>';

-- Marcar conta como paga
-- UPDATE bills SET paid_at = now(), status = 'paid' WHERE id = '<BILL_ID>';

-- Total a pagar no mês
-- SELECT SUM(amount) FROM bills 
-- WHERE user_id = '<USER_ID>' 
-- AND status = 'pending'
-- AND EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM CURRENT_DATE);

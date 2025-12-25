-- =====================================================
-- Auto-update Bills Status to Overdue
-- =====================================================
-- Esta função atualiza automaticamente contas pendentes
-- para "atrasadas" quando passa do vencimento

-- Função para atualizar status de contas atrasadas
CREATE OR REPLACE FUNCTION update_overdue_bills()
RETURNS void AS $$
BEGIN
    UPDATE bills
    SET status = 'overdue'
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE
    AND paid_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION update_overdue_bills() IS 
'Atualiza status de contas pendentes para overdue quando vencidas';

-- Execute a função uma vez para atualizar contas já vencidas
SELECT update_overdue_bills();

-- =====================================================
-- Opcional: Criar uma trigger que roda ao consultar
-- =====================================================
-- Esta view sempre retorna o status correto calculado em tempo real

CREATE OR REPLACE VIEW bills_with_current_status AS
SELECT 
    id,
    user_id,
    title,
    description,
    amount,
    due_date,
    paid_at,
    CASE 
        WHEN paid_at IS NOT NULL THEN 'paid'
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
    END AS status,
    type,
    category_id,
    created_at,
    updated_at
FROM bills;

-- Comentário
COMMENT ON VIEW bills_with_current_status IS 
'View que calcula o status em tempo real baseado na data de vencimento';

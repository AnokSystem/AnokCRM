-- =====================================================
-- RPC Function: get_pending_bills_for_notifications
-- =====================================================
-- Retorna contas pendentes que precisam de notificação
-- Usado pelo workflow n8n para disparar lembretes automáticos
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_bills_for_notifications()
RETURNS TABLE (
    bill_id UUID,
    user_id UUID,
    title TEXT,
    amount DECIMAL,
    due_date DATE,
    notification_type TEXT,
    notification_phone TEXT,
    whatsapp_instance TEXT,
    webhook_url TEXT,
    message TEXT,
    category_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id AS bill_id,
        b.user_id,
        b.title,
        b.amount,
        b.due_date,
        
        -- Determinar tipo de notificação
        CASE 
            WHEN b.due_date = CURRENT_DATE THEN 'reminder_due'::TEXT
            WHEN b.due_date = CURRENT_DATE + INTERVAL '1 day' THEN 'reminder_1d'::TEXT
        END AS notification_type,
        
        -- Configurações do usuário
        bns.notification_phone,
        bns.whatsapp_instance,
        
        -- Buscar webhook_url do admin panel
        (SELECT value FROM system_settings WHERE key = 'bills_notification_webhook_url' LIMIT 1) AS webhook_url,
        
        -- Montar mensagem formatada
        CASE 
            WHEN b.due_date = CURRENT_DATE THEN
                '⚠️ *Conta Vencendo Hoje*' || E'\n\n' ||
                'A conta *' || b.title || '* vence HOJE!' || E'\n\n' ||
                '💰 Valor: R$ ' || TRIM(TO_CHAR(b.amount, '999999999D99')) || E'\n' ||
                '📅 Vencimento: Hoje' || E'\n' ||
                '🏷️ Categoria: ' || COALESCE(bc.name, 'Sem categoria') || E'\n\n' ||
                '_⏰ Último dia para pagamento sem multa!_'
            WHEN b.due_date = CURRENT_DATE + INTERVAL '1 day' THEN
                '🔔 *Lembrete de Conta*' || E'\n\n' ||
                'A conta *' || b.title || '* vence amanhã!' || E'\n\n' ||
                '💰 Valor: R$ ' || TRIM(TO_CHAR(b.amount, '999999999D99')) || E'\n' ||
                '📅 Vencimento: ' || TO_CHAR(b.due_date, 'DD/MM/YYYY') || E'\n' ||
                '🏷️ Categoria: ' || COALESCE(bc.name, 'Sem categoria') || E'\n\n' ||
                '_Não esqueça de efetuar o pagamento!_'
        END AS message,
        
        bc.name AS category_name
        
    FROM bills b
    INNER JOIN bill_notification_settings bns ON bns.user_id = b.user_id
    LEFT JOIN bill_categories bc ON bc.id = b.category_id
    
    WHERE 
        -- Apenas contas pendentes
        b.status = 'pending'
        
        -- Que vencem hoje OU amanhã
        AND (
            b.due_date = CURRENT_DATE 
            OR b.due_date = CURRENT_DATE + INTERVAL '1 day'
        )
        
        -- Verificar se a notificação está habilitada
        AND (
            (b.due_date = CURRENT_DATE AND bns.notify_on_due_date = true) OR
            (b.due_date = CURRENT_DATE + INTERVAL '1 day' AND bns.notify_1day_before = true)
        )
        
        -- Não enviar se já foi enviada hoje (evitar duplicatas)
        AND NOT EXISTS (
            SELECT 1 
            FROM bill_notifications bn 
            WHERE bn.bill_id = b.id 
            AND bn.notification_type = CASE 
                WHEN b.due_date = CURRENT_DATE THEN 'reminder_due'
                WHEN b.due_date = CURRENT_DATE + INTERVAL '1 day' THEN 'reminder_1d'
            END
            AND DATE(bn.sent_at) = CURRENT_DATE
        )
    
    ORDER BY b.due_date ASC, b.amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para documentação
COMMENT ON FUNCTION get_pending_bills_for_notifications() IS 
'Retorna contas pendentes que precisam de notificação WhatsApp. 
Usado pelo n8n para disparar lembretes automáticos.
Verifica configurações do usuário e evita duplicatas.';

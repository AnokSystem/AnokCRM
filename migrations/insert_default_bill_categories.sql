-- Inserir Categorias Padrão de Contas a Pagar
-- Execute este SQL no Supabase para criar categorias organizadas por tipo de despesa

-- IMPORTANTE: Substitua 'SEU_USER_ID' pelo seu ID de usuário
-- Para pegar seu user_id, rode: SELECT id FROM auth.users WHERE email = 'seu_email@dominio.com';

DO $$
DECLARE
    v_user_id UUID := 'SEU_USER_ID'; -- ⬅️ ALTERE AQUI
BEGIN
    -- Tecnologia e Software
    INSERT INTO bill_categories (user_id, name, color, icon) VALUES
    (v_user_id, 'Hospedagem', '#3b82f6', 'Server'),
    (v_user_id, 'Software', '#8b5cf6', 'Code'),
    (v_user_id, 'SaaS', '#6366f1', 'Cloud'),
    (v_user_id, 'Domínios', '#0ea5e9', 'Globe');

    -- Marketing e Vendas
    INSERT INTO bill_categories (user_id, name, color, icon) VALUES
    (v_user_id, 'Marketing', '#ef4444', 'TrendingUp'),
    (v_user_id, 'Publicidade', '#f97316', 'Megaphone'),
    (v_user_id, 'Redes Sociais', '#ec4899', 'Share2');

    -- Serviços e Assinaturas
    INSERT INTO bill_categories (user_id, name, color, icon) VALUES
    (v_user_id, 'Assinaturas', '#a855f7', 'Repeat'),
    (v_user_id, 'Streaming', '#d946ef', 'Play'),
    (v_user_id, 'Ferramentas', '#06b6d4', 'Wrench');

    -- Infraestrutura
    INSERT INTO bill_categories (user_id, name, color, icon) VALUES
    (v_user_id, 'Energia', '#eab308', 'Zap'),
    (v_user_id, 'Internet', '#10b981', 'Wifi'),
    (v_user_id, 'Telefonia', '#14b8a6', 'Phone');

    -- Administrativo
    INSERT INTO bill_categories (user_id, name, color, icon) VALUES
    (v_user_id, 'Contador', '#84cc16', 'Calculator'),
    (v_user_id, 'Jurídico', '#22c55e', 'Scale'),
    (v_user_id, 'Seguros', '#059669', 'Shield');

    -- Geral
    INSERT INTO bill_categories (user_id, name, color, icon) VALUES
    (v_user_id, 'Fornecedores', '#f59e0b', 'Package'),
    (v_user_id, 'Impostos', '#dc2626', 'FileText'),
    (v_user_id, 'Outros', '#6b7280', 'MoreHorizontal');

END $$;

-- Verificar categorias criadas
-- SELECT name, color, icon FROM bill_categories WHERE user_id = 'SEU_USER_ID' ORDER BY name;

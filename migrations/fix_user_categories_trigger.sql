-- 1. Helper function to create default categories for a given user
CREATE OR REPLACE FUNCTION public.create_default_bill_categories(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.bill_categories (user_id, name, color, icon) VALUES
    -- Tecnologia e Software
    (target_user_id, 'Hospedagem', '#3b82f6', 'Server'),
    (target_user_id, 'Software', '#8b5cf6', 'Code'),
    (target_user_id, 'SaaS', '#6366f1', 'Cloud'),
    (target_user_id, 'Domínios', '#0ea5e9', 'Globe'),
    -- Marketing e Vendas
    (target_user_id, 'Marketing', '#ef4444', 'TrendingUp'),
    (target_user_id, 'Publicidade', '#f97316', 'Megaphone'),
    (target_user_id, 'Redes Sociais', '#ec4899', 'Share2'),
    -- Serviços e Assinaturas
    (target_user_id, 'Assinaturas', '#a855f7', 'Repeat'),
    (target_user_id, 'Streaming', '#d946ef', 'Play'),
    (target_user_id, 'Ferramentas', '#06b6d4', 'Wrench'),
    -- Infraestrutura
    (target_user_id, 'Energia', '#eab308', 'Zap'),
    (target_user_id, 'Internet', '#10b981', 'Wifi'),
    (target_user_id, 'Telefonia', '#14b8a6', 'Phone'),
    (target_user_id, 'Água', '#06b6d4', 'Droplet'),
    (target_user_id, 'Aluguel', '#6366f1', 'Building'),
    -- Administrativo
    (target_user_id, 'Contador', '#84cc16', 'Calculator'),
    (target_user_id, 'Jurídico', '#22c55e', 'Scale'),
    (target_user_id, 'Seguros', '#059669', 'Shield'),
    -- Geral
    (target_user_id, 'Fornecedores', '#f59e0b', 'Package'),
    (target_user_id, 'Impostos', '#dc2626', 'FileText'),
    (target_user_id, 'Outros', '#6b7280', 'MoreHorizontal')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function to call the helper for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.create_default_bill_categories(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_categories
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_categories();

-- 4. Backfill: Run for all existing users who have NO categories
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM auth.users LOOP
        -- Run for ALL users to ensure they get Water/Rent if missing
        PERFORM public.create_default_bill_categories(r.id);
    END LOOP;
END $$;

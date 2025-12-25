-- Fix RLS for Financial Metrics (Orders & Bills)
-- Ensures strict individual data isolation

-- 1. Orders (lead_orders)
ALTER TABLE lead_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON lead_orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON lead_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON lead_orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON lead_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON lead_orders;

-- Policy: Users only see their own orders
CREATE POLICY "Users can view own orders"
    ON lead_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
    ON lead_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
    ON lead_orders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
    ON lead_orders FOR DELETE
    USING (auth.uid() = user_id);


-- 2. Bills (bills)
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bills" ON bills;
DROP POLICY IF EXISTS "Admins can view all bills" ON bills;

-- Broken down into specific actions for clarity
CREATE POLICY "Users can view own bills"
    ON bills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
    ON bills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
    ON bills FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
    ON bills FOR DELETE
    USING (auth.uid() = user_id);


-- 3. Bill Categories (bill_categories)
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bill categories" ON bill_categories;

CREATE POLICY "Users can view own categories"
    ON bill_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
    ON bill_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
    ON bill_categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
    ON bill_categories FOR DELETE
    USING (auth.uid() = user_id);

-- Optional: If Admins need Global View, uncomment below:
-- CREATE POLICY "Admins can view all orders" ON lead_orders FOR SELECT USING (
--     auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
-- );

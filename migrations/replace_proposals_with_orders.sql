-- Migration: Replace Proposals with Orders

-- 1. Drop existing Proposals table (Destructive)
drop table if exists lead_proposals cascade;

-- 2. Create Orders table
create table if not exists lead_orders (
    id uuid default gen_random_uuid() primary key,
    lead_id uuid references leads(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null, -- Could be "Order #123" or "Website Dev"
    description text,
    amount numeric(10, 2) default 0,
    status text default 'pending', -- pending, paid, cancelled, refunded
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table lead_orders enable row level security;

-- 4. Create Policies
create policy "Users can view their own orders"
    on lead_orders for select
    using (auth.uid() = user_id);

create policy "Users can insert their own orders"
    on lead_orders for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own orders"
    on lead_orders for update
    using (auth.uid() = user_id);

create policy "Users can delete their own orders"
    on lead_orders for delete
    using (auth.uid() = user_id);

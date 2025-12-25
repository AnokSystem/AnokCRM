-- Add nodes_count if it doesn't exist (Fix for PGRST204)
alter table flows add column if not exists nodes_count integer default 0;

-- Ensure other columns exist
alter table flows add column if not exists description text;
alter table flows add column if not exists status text default 'rascunho' check (status in ('ativo', 'inativo', 'rascunho'));

-- Refresh cache hint (running DDL usually triggers it)
comment on table flows is 'Table for storing automation flows';

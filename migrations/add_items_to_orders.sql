-- Migration: Add items column to lead_orders

alter table lead_orders
add column if not exists items jsonb default '[]'::jsonb;

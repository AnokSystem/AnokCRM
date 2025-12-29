-- Add discount column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

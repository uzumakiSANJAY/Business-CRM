-- ============================================================
-- Migration v2: Payment Mode, Vendor Route, Categories
-- Run: psql -U <user> -d vendor_crm -f database/migration_v2.sql
-- ============================================================

-- 1. payment_mode enum
DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('CASH', 'UPI', 'CREDIT_CARD', 'CHEQUE', 'BANK_TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. categories table
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. vendors: route + category_id
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS route       VARCHAR(200);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category_id INT REFERENCES categories(id);

-- 4. collections: payment_mode
ALTER TABLE collections ADD COLUMN IF NOT EXISTS payment_mode payment_mode NOT NULL DEFAULT 'CASH';

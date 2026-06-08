-- ============================================================
-- Migration v4: Item Master Hierarchy (Item -> Company -> Type)
-- Run: psql -U <user> -d vendor_crm -f database/migration_v4.sql
-- ============================================================

-- 1. item_companies table (companies registered under an item, e.g. Khol -> Tata)
CREATE TABLE IF NOT EXISTS item_companies (
  id          SERIAL PRIMARY KEY,
  item_id     INT REFERENCES items(id) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (item_id, name)
);

-- 2. item_types table (package/type names registered under a company, e.g. Tata -> 5kg Bag)
CREATE TABLE IF NOT EXISTS item_types (
  id              SERIAL PRIMARY KEY,
  item_company_id INT REFERENCES item_companies(id) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (item_company_id, name)
);

-- 3. soudas: link orders to the selected company + type
ALTER TABLE soudas ADD COLUMN IF NOT EXISTS item_company_id INT REFERENCES item_companies(id);
ALTER TABLE soudas ADD COLUMN IF NOT EXISTS item_type_id    INT REFERENCES item_types(id);

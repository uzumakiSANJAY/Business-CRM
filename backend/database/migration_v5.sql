-- ============================================================
-- Migration v5: Vehicle Master
-- Run: psql -U <user> -d vendor_crm -f database/migration_v5.sql
-- ============================================================

-- vehicles table (registered vehicle/car numbers, e.g. "RJ 14 GA 1234")
CREATE TABLE IF NOT EXISTS vehicles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

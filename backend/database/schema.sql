-- ============================================================
-- Vendor Collection CRM - Database Schema
-- Run this file against your PostgreSQL database:
--   psql -U <user> -d vendor_crm -f database/schema.sql
-- ============================================================

-- Create ENUM types (idempotent)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'COLLECTOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bill_status AS ENUM ('ACTIVE', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE collection_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'COLLECTOR',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  phone          VARCHAR(20),
  address        TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_by     INT REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id             SERIAL PRIMARY KEY,
  vendor_id      INT REFERENCES vendors(id) NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status         bill_status DEFAULT 'ACTIVE',
  generated_by   INT REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Enforce only one ACTIVE bill per vendor
CREATE UNIQUE INDEX IF NOT EXISTS one_active_bill_per_vendor
  ON bills(vendor_id) WHERE status = 'ACTIVE';

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id               SERIAL PRIMARY KEY,
  bill_id          INT REFERENCES bills(id) NOT NULL,
  vendor_id        INT REFERENCES vendors(id) NOT NULL,
  collector_id     INT REFERENCES users(id) NOT NULL,
  amount           NUMERIC(12,2) NOT NULL,
  collection_date  DATE NOT NULL,
  notes            TEXT,
  status           collection_status DEFAULT 'PENDING',
  rejection_reason TEXT,
  submitted_at     TIMESTAMP DEFAULT NOW(),
  confirmed_at     TIMESTAMP,
  confirmed_by     INT REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   INT,
  details     JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Migration v3: Souda (Order Tracking) Module
-- Run: psql -U <user> -d vendor_crm -f database/migration_v3.sql
-- ============================================================

-- 1. items table (product master)
CREATE TABLE IF NOT EXISTS items (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL UNIQUE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 2. dalals table (agent/broker master)
CREATE TABLE IF NOT EXISTS dalals (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. soudas table (orders)
CREATE TABLE IF NOT EXISTS soudas (
  id            SERIAL PRIMARY KEY,
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id     INT REFERENCES vendors(id) NOT NULL,
  item_id       INT REFERENCES items(id) NOT NULL,
  qty_ordered   NUMERIC(10,2) NOT NULL,
  rate          NUMERIC(10,2) NOT NULL,
  location      VARCHAR(200),
  dalal_id      INT REFERENCES dalals(id),
  notes         TEXT,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4. souda_deliveries table (delivery batches)
CREATE TABLE IF NOT EXISTS souda_deliveries (
  id              SERIAL PRIMARY KEY,
  souda_id        INT REFERENCES soudas(id) ON DELETE CASCADE NOT NULL,
  delivery_date   DATE NOT NULL,
  qty_delivered   NUMERIC(10,2) NOT NULL,
  notes           TEXT,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

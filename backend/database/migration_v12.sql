-- migration_v12: loose inventory extensions — rate tracking, vendor dispatch, containerisation

-- Extend inventory_ledger with rate, vendor link, and transaction type label
ALTER TABLE inventory_ledger
  ADD COLUMN IF NOT EXISTS rate      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vendor_id INT REFERENCES vendors(id),
  ADD COLUMN IF NOT EXISTS txn_type  VARCHAR(30);
-- txn_type values: 'PURCHASE' | 'VENDOR_DISPATCH' | 'CONTAINERISE' | 'MANUAL'

-- Master for container types (15 Lit Tin Jar, 5 Lit Jar, etc.)
CREATE TABLE IF NOT EXISTS loose_container_types (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  capacity_litres  NUMERIC(10,3) NOT NULL CHECK (capacity_litres > 0),
  is_active        BOOLEAN DEFAULT true,
  created_by       INT REFERENCES users(id),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Ledger for container stock (fills from bulk + sales)
CREATE TABLE IF NOT EXISTS loose_container_ledger (
  id                SERIAL PRIMARY KEY,
  container_type_id INT NOT NULL REFERENCES loose_container_types(id),
  direction         VARCHAR(10) NOT NULL CHECK (direction IN ('INWARD', 'OUTWARD')),
  quantity          NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  rate              NUMERIC(12,2),
  txn_date          DATE NOT NULL,
  vendor_id         INT REFERENCES vendors(id),
  source_item_id    INT REFERENCES inventory_items(id),
  txn_type          VARCHAR(30),
  -- txn_type values: 'FILL' (from containerise) | 'SALE'
  notes             TEXT,
  created_by        INT REFERENCES users(id),
  created_at        TIMESTAMP DEFAULT NOW()
);

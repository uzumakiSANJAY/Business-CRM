-- migration_v11: inventory management (packed + loose products)

CREATE TABLE IF NOT EXISTS inventory_items (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  type            VARCHAR(10)  NOT NULL CHECK (type IN ('PACKED', 'LOOSE')),
  unit            VARCHAR(50)  NOT NULL DEFAULT 'pcs',
  -- PACKED only: link to Souda master hierarchy (NULL for LOOSE)
  item_id         INT REFERENCES items(id),
  item_company_id INT REFERENCES item_companies(id),
  item_type_id    INT REFERENCES item_types(id),
  is_active       BOOLEAN DEFAULT true,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id         SERIAL PRIMARY KEY,
  item_id    INT  NOT NULL REFERENCES inventory_items(id),
  direction  VARCHAR(10) NOT NULL CHECK (direction IN ('INWARD', 'OUTWARD')),
  quantity   NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  txn_date   DATE NOT NULL,
  notes      TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

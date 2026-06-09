-- migration_v6: add bill_type (CASH / CHEQUE) to bills
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS bill_type VARCHAR(10) NOT NULL DEFAULT 'CASH'
    CHECK (bill_type IN ('CASH', 'CHEQUE'));

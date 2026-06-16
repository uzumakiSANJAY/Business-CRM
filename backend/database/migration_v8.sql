-- migration_v8: add trip tracking to souda_deliveries
ALTER TABLE souda_deliveries
  ADD COLUMN IF NOT EXISTS trip_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS trip_time   TIME;

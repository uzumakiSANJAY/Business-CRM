-- migration_v10: remove one-active-bill-per-vendor restriction
DROP INDEX IF EXISTS one_active_bill_per_vendor;

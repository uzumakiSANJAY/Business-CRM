-- migration_v9: routes master table
CREATE TABLE IF NOT EXISTS routes (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

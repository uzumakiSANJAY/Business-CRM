-- migration_v7: add sort_order to vendors for drag-and-drop reordering
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sort_order INT;

-- initialize sort_order based on current name order so existing rows get a value
UPDATE vendors v
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM vendors
) sub
WHERE v.id = sub.id;

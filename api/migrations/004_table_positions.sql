USE marisqueria;

-- Add position columns to restaurant_tables for visual layout
ALTER TABLE restaurant_tables
  ADD COLUMN pos_x INT DEFAULT 0,
  ADD COLUMN pos_y INT DEFAULT 0,
  ADD COLUMN width INT DEFAULT 1,
  ADD COLUMN height INT DEFAULT 1;

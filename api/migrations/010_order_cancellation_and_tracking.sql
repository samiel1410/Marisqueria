USE marisqueria;

ALTER TABLE orders ADD COLUMN updated_by INT NULL;
ALTER TABLE orders MODIFY COLUMN status ENUM('pendiente', 'en cocina', 'entregado', 'cobrado', 'cancelado') DEFAULT 'pendiente';

ALTER TABLE cash_movements ADD COLUMN cancelled_at TIMESTAMP NULL;
ALTER TABLE cash_movements ADD COLUMN cancelled_by INT NULL;

ALTER TABLE orders ADD CONSTRAINT fk_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cash_movements ADD CONSTRAINT fk_cash_movements_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

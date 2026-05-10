-- Migración para soportar pagos mixtos y múltiples pagos por orden
CREATE TABLE IF NOT EXISTS order_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('efectivo', 'transferencia', 'tarjeta') NOT NULL,
    bank_account_id INT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- Asegurar que la tabla orders tiene las columnas necesarias si no existen
-- (Ignorar errores si ya existen)
-- ALTER TABLE orders ADD COLUMN cash_amount DECIMAL(10,2) DEFAULT 0;
-- ALTER TABLE orders ADD COLUMN transfer_amount DECIMAL(10,2) DEFAULT 0;
-- ALTER TABLE orders ADD COLUMN bank_account_id INT NULL;

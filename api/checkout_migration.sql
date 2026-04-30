CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identification VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(50),
    owner_name VARCHAR(200),
    owner_id VARCHAR(20),
    qr_path VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN customer_id INT NULL;
ALTER TABLE orders ADD CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE orders MODIFY COLUMN payment_method ENUM('efectivo', 'transferencia', 'tarjeta', 'mixto') DEFAULT 'efectivo';

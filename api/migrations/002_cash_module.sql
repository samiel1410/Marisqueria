USE marisqueria;

CREATE TABLE IF NOT EXISTS cash_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    opening_balance DECIMAL(10, 2) NOT NULL,
    closing_balance DECIMAL(10, 2) DEFAULT NULL,
    total_sales DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('open', 'closed') DEFAULT 'open',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cash_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    type ENUM('ingreso', 'egreso') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
);

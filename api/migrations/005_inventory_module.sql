USE marisqueria;

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extend products table
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS brand_id INT NULL,
    ADD COLUMN IF NOT EXISTS image_path VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unidades';

-- Product-Branch stock (one product can exist in multiple branches with different stock)
CREATE TABLE IF NOT EXISTS product_branch_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    branch_id INT NOT NULL,
    stock INT DEFAULT 0,
    UNIQUE KEY uq_product_branch (product_id, branch_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Inventory movements (kardex)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    branch_id INT NULL,
    type ENUM('entrada', 'salida', 'ajuste') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL DEFAULT 0,
    new_stock INT NOT NULL DEFAULT 0,
    reason VARCHAR(255) NULL,
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

USE marisqueria;

-- 1) Crear tabla de sucursales
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Agregar columna branch_id a users (si no existe)
-- Usar una consulta simple que no cause problemas con consultas bufferizadas
-- Ignorar error si la columna ya existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INT NULL AFTER password;

-- 3) Modificar role enum
ALTER TABLE users MODIFY COLUMN role ENUM('admin','empleado','cajero','mesero','cocina') NOT NULL DEFAULT 'empleado';

-- 4) Añadir FK a branches
ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- 5) Insertar sucursal por defecto y asignarla al usuario admin si existe
INSERT IGNORE INTO branches (name, address) VALUES ('Sucursal Principal', 'Dirección principal');
UPDATE users SET branch_id = 1 WHERE username = 'admin';

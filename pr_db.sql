-- --------------------------------------------------------
-- Create and select the database
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS pr_db;
USE pr_db;

-- --------------------------------------------------------
-- Table: reservation
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    time DATETIME NOT NULL,
    court_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table: receipt
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    receipt_image MEDIUMTEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

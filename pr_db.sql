-- ============================================================
-- PicklePro — Court Reservation System
-- Database Setup Script
-- Run once in phpMyAdmin or via MySQL CLI:
--   mysql -u root -p < db_setup.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS pr_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pr_db;

-- ------------------------------------------------------------
-- Table: bookings
-- Stores every court reservation slot
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date         DATE NOT NULL,
    time         TIME NOT NULL,
    court        TINYINT UNSIGNED NOT NULL,
    user_name    VARCHAR(120) NOT NULL,
    user_email   VARCHAR(180) NOT NULL,
    user_phone   VARCHAR(30)  NOT NULL,
    status       ENUM('pending', 'awaiting', 'booked') NOT NULL DEFAULT 'pending',
    receipt_path VARCHAR(300) DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent double-booking the same court/date/time
    UNIQUE KEY uq_slot (date, time, court),
    INDEX idx_date  (date),
    INDEX idx_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: courts
-- Tracks which courts are active / available for booking
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courts (
    court_number TINYINT UNSIGNED PRIMARY KEY,
    is_active    TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed courts 1–8 (skip if already present)
INSERT IGNORE INTO courts (court_number, is_active) VALUES
    (1, 1), (2, 1), (3, 1), (4, 1),
    (5, 1), (6, 1), (7, 1), (8, 1);

-- ------------------------------------------------------------
-- Table: settings
-- Key/value store for admin-configurable options (e.g. GCash QR)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    setting_key   VARCHAR(60) PRIMARY KEY,
    setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default GCash QR (placeholder — replace via Admin > Settings)
INSERT IGNORE INTO settings (setting_key, setting_value)
    VALUES ('gcash_qr', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCash+09123456789');

-- ============================================================
-- Optional: sample bookings for testing
-- Uncomment the block below to load demo data
-- ============================================================
/*
INSERT IGNORE INTO bookings (date, time, court, user_name, user_email, user_phone, status, receipt_path) VALUES
    (CURDATE(), '08:00:00', 2, 'Mario Reyes', 'mario@email.com', '09171234567', 'booked',   NULL),
    (CURDATE(), '09:00:00', 2, 'Mario Reyes', 'mario@email.com', '09171234567', 'booked',   NULL),
    (CURDATE(), '10:00:00', 5, 'Ana Santos',  'ana@email.com',   '09281234567', 'awaiting', NULL),
    (CURDATE(), '13:00:00', 1, 'Ben Cruz',    'ben@email.com',   '09391234567', 'pending',  NULL),
    (CURDATE(), '14:00:00', 3, 'Cora Lim',    'cora@email.com',  '09451234567', 'booked',   NULL),
    (CURDATE(), '16:00:00', 7, 'Dante Go',    'dante@email.com', '09561234567', 'awaiting', NULL);
*/

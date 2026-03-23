-- =============================================================
-- AUTH DATABASE SCHEMA
-- Emergency Response Coordination Platform
-- Handles user authentication, roles, and session management
-- =============================================================

-- Drop existing tables if re-running setup
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================
-- USERS TABLE
-- Stores all system administrators and service admins
-- =============================================================
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(150)        UNIQUE NOT NULL,
    password_hash VARCHAR(255)      NOT NULL,
    role        VARCHAR(50)         NOT NULL CHECK (role IN (
                    'system_admin',
                    'hospital_admin',
                    'police_admin',
                    'fire_admin',
                    'ambulance_admin'
                )),
    is_active   BOOLEAN             DEFAULT TRUE,
    created_at  TIMESTAMP           DEFAULT NOW(),
    updated_at  TIMESTAMP           DEFAULT NOW()
);

-- Index for fast login lookups by email
CREATE INDEX idx_users_email ON users(email);
-- Index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- =============================================================
-- REFRESH TOKENS TABLE
-- Stores JWT refresh tokens for session management
-- =============================================================
CREATE TABLE refresh_tokens (
    token_id    SERIAL PRIMARY KEY,
    user_id     INT                 NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token       TEXT                NOT NULL UNIQUE,
    expires_at  TIMESTAMP           NOT NULL,
    created_at  TIMESTAMP           DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- =============================================================
-- SEED DATA — Demo users
-- Hospital Admin now manages both hospital capacity AND ambulances.
-- No separate ambulance_admin role exists.
-- Default password for all: Password123!
-- =============================================================

INSERT INTO users (name, email, password_hash, role) VALUES
(
    'Sarah Mitchell',
    'admin@ercplatform.gov',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'system_admin'
),
(
    'Dr. James Okafor',
    'hospital@ercplatform.gov',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'hospital_admin'
),
(
    'Inspector Lena Farrell',
    'police@ercplatform.gov',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'police_admin'
),
(
    'Chief Marcus Blaine',
    'fire@ercplatform.gov',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'fire_admin'
);

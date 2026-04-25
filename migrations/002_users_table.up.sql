-- GPU Compute Platform - Add Users Table
-- Creates the users table for account management and authentication

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');

-- ============================================
-- Tables
-- ============================================

-- User Table: Stores platform user accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE users IS 'Platform user accounts for authentication and authorization';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.username IS 'Display username';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of the user password';
COMMENT ON COLUMN users.role IS 'User role for RBAC (admin, user, viewer)';

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Triggers for updated_at timestamps
-- ============================================

-- Function to automatically update updated_at column (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

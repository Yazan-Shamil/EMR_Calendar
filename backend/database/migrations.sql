-- EMR Calendar Authentication System Database Schema Changes
-- This file contains the necessary database changes to support JWT authentication

-- Add password_hash field to existing users table
-- Note: This assumes the users table already exists as defined in the PRD
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create refresh_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for refresh_tokens table
CREATE TRIGGER update_refresh_tokens_updated_at
    BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample users for testing (optional - for development only)
-- Password is 'password123' hashed with bcrypt cost 12
-- ONLY run this in development environment
INSERT INTO users (id, email, full_name, role, password_hash, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'provider@example.com', 'Dr. John Provider', 'provider', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3fgjL3Gd.W', NOW(), NOW()),
    (gen_random_uuid(), 'patient@example.com', 'Jane Patient', 'patient', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3fgjL3Gd.W', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Note: The above users insert is for development/testing only
-- In production, users should be created through the application endpoints
-- with proper validation and secure password hashing
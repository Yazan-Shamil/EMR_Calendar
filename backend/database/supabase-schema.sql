-- EMR Calendar Supabase Database Schema
-- This file contains the database schema for the EMR Calendar system using Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('provider', 'patient');
CREATE TYPE event_type AS ENUM ('appointment', 'block');
CREATE TYPE event_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create user table (extends Supabase auth.users)
-- This table stores additional profile information not handled by Supabase auth
CREATE TABLE IF NOT EXISTS user (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create events table (appointments + blocks)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type event_type NOT NULL,
    status event_status NOT NULL DEFAULT 'pending',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Check constraints
    CONSTRAINT chk_event_times CHECK (ends_at > starts_at),
    CONSTRAINT chk_appointment_patient CHECK (
        (event_type = 'appointment' AND patient_id IS NOT NULL) OR
        (event_type = 'block' AND patient_id IS NULL)
    )
);

-- Create availability table (provider working hours)
CREATE TABLE IF NOT EXISTS availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    day_of_week INTEGER, -- 0-6 (Sunday=0), null for overrides
    start_time TIME, -- Daily start time, null for overrides
    end_time TIME, -- Daily end time, null for overrides
    start_date DATE, -- Override range start, null for recurring
    end_date DATE, -- Override range end, null for recurring
    is_override BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Check constraints
    CONSTRAINT chk_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    CONSTRAINT chk_times CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
    CONSTRAINT chk_dates CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_availability_type CHECK (
        (day_of_week IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_date IS NULL AND end_date IS NULL AND NOT is_override) OR
        (day_of_week IS NULL AND start_time IS NULL AND end_time IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL AND is_override)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_role ON user(role);
CREATE INDEX IF NOT EXISTS idx_events_provider_starts_at ON events(provider_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_patient_starts_at ON events(patient_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_availability_provider ON availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_availability_provider_dow ON availability(provider_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_override ON availability(provider_id, start_date, end_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON user
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
    BEFORE UPDATE ON availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE user ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own profile" ON user
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Events policies (simplified - will need refinement)
CREATE POLICY "Providers can manage their events" ON events
    FOR ALL USING (
        provider_id = auth.uid()
    );

CREATE POLICY "Patients can view their appointments" ON events
    FOR SELECT USING (patient_id = auth.uid());

-- Availability policies
CREATE POLICY "Providers can manage their availability" ON availability
    FOR ALL USING (
        provider_id = auth.uid()
    );

-- Insert sample data for testing (optional - run only in development)
-- Uncomment the following lines for testing

/*
-- Note: User profiles will be created via the API after Supabase auth signup
-- Sample profiles would be inserted after users sign up through Supabase Auth
*/

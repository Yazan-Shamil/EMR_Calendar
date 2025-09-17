-- EMR Calendar MVP Database Schema
-- 3 Tables: users, events, availability

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (simplified - no teams/providers separation)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('provider', 'patient', 'admin')),
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Events Table (appointments + blocks unified)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('appointment', 'block')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Only for appointments
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Business logic constraints
    CONSTRAINT end_after_start CHECK (end_time > start_time),
    CONSTRAINT appointment_needs_patient CHECK (
        (event_type = 'appointment' AND patient_id IS NOT NULL) OR
        (event_type = 'block' AND patient_id IS NULL)
    )
);

-- 3. Availability Table (recurring rules + overrides)
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Recurring availability (weekly pattern)
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME, -- Daily start time (e.g., 09:00)
    end_time TIME,   -- Daily end time (e.g., 17:00)

    -- Date-specific overrides
    override_date DATE, -- Specific date for override (NULL for recurring)
    is_available BOOLEAN NOT NULL DEFAULT true, -- false for "closed" overrides

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Business logic constraints
    CONSTRAINT time_logic CHECK (end_time > start_time),
    CONSTRAINT recurring_or_override CHECK (
        (day_of_week IS NOT NULL AND override_date IS NULL) OR
        (day_of_week IS NULL AND override_date IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_patient_id ON events(patient_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_availability_user_id ON availability(user_id);
CREATE INDEX idx_availability_day_of_week ON availability(day_of_week);
CREATE INDEX idx_availability_override_date ON availability(override_date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO users (id, email, full_name, role, timezone) VALUES
('ea21c216-064b-4972-922c-5f86705df4c4', 'test@example.com', 'Test Provider', 'provider', 'UTC'),
('f1234567-1234-1234-1234-123456789012', 'patient@example.com', 'Test Patient', 'patient', 'UTC');

-- Sample recurring availability (Mon-Fri 9-5)
INSERT INTO availability (user_id, day_of_week, start_time, end_time) VALUES
('ea21c216-064b-4972-922c-5f86705df4c4', 1, '09:00', '17:00'), -- Monday
('ea21c216-064b-4972-922c-5f86705df4c4', 2, '09:00', '17:00'), -- Tuesday
('ea21c216-064b-4972-922c-5f86705df4c4', 3, '09:00', '17:00'), -- Wednesday
('ea21c216-064b-4972-922c-5f86705df4c4', 4, '09:00', '17:00'), -- Thursday
('ea21c216-064b-4972-922c-5f86705df4c4', 5, '09:00', '17:00'); -- Friday

-- Sample events
INSERT INTO events (title, start_time, end_time, event_type, status, created_by, patient_id) VALUES
('Doctor Appointment', '2025-09-17 10:00:00+00', '2025-09-17 11:00:00+00', 'appointment', 'confirmed', 'ea21c216-064b-4972-922c-5f86705df4c4', 'f1234567-1234-1234-1234-123456789012'),
('Lunch Break', '2025-09-17 12:00:00+00', '2025-09-17 13:00:00+00', 'block', 'confirmed', 'ea21c216-064b-4972-922c-5f86705df4c4', NULL);
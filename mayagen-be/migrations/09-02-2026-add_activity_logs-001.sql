-- Migration: Add Activity Logs
-- Date: 09-02-2026

-- Add columns to User table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone_number VARCHAR;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS location VARCHAR;

-- Create ActivityLog table
CREATE TABLE IF NOT EXISTS activitylog (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR NOT NULL,
    method VARCHAR,
    endpoint VARCHAR,
    ip_address VARCHAR,
    location VARCHAR,
    user_agent VARCHAR,
    details JSONB,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES "user"(id)
);

-- Create Indices
CREATE INDEX IF NOT EXISTS ix_activitylog_user_id ON activitylog (user_id);
CREATE INDEX IF NOT EXISTS ix_activitylog_action ON activitylog (action);

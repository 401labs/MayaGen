-- Migration: Add blocked_ip table for IP blocking functionality
-- Date: 2026-02-10

CREATE TABLE IF NOT EXISTS blocked_ip (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT,
    blocked_by_user_id INTEGER REFERENCES "user"(id),
    blocked_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_ip_address ON blocked_ip(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ip_active ON blocked_ip(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_ip_expires ON blocked_ip(expires_at) WHERE expires_at IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE blocked_ip IS 'Tracks blocked IP addresses for security and moderation';
COMMENT ON COLUMN blocked_ip.ip_address IS 'IPv4 or IPv6 address to block';
COMMENT ON COLUMN blocked_ip.reason IS 'Admin-provided reason for blocking';
COMMENT ON COLUMN blocked_ip.blocked_by_user_id IS 'Admin user who blocked this IP';
COMMENT ON COLUMN blocked_ip.expires_at IS 'Optional expiry date for temporary blocks';
COMMENT ON COLUMN blocked_ip.is_active IS 'Whether this block is currently active';

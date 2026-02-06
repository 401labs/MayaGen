-- Migration: Add is_public column to BatchJob and Image tables
-- Date: 06-02-2026

ALTER TABLE batchjob ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE image ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

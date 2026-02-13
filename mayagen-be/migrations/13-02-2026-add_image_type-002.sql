-- Migration: Add image_type column
-- Created: 2026-02-13
-- Description: Adds image_type column to categorize how images were created

ALTER TABLE image ADD COLUMN IF NOT EXISTS image_type VARCHAR(20) DEFAULT 'TEXT_TO_IMAGE';

-- Update existing edited images to IMAGE_EDIT
UPDATE image SET image_type = 'IMAGE_EDIT' WHERE is_edit = true AND image_type = 'TEXT_TO_IMAGE';

-- Update existing batch images to BATCH
UPDATE image SET image_type = 'BATCH' WHERE batch_job_id IS NOT NULL AND image_type = 'TEXT_TO_IMAGE';

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_image_type ON image(image_type);

COMMENT ON COLUMN image.image_type IS 'How this image was created: TEXT_TO_IMAGE, IMAGE_EDIT, or BATCH';

-- Migration: Add Image Editing/Variation Support
-- Created: 2026-02-13
-- Description: Adds fields to Image table to support image-to-image editing/variation feature

-- Add columns for image editing (idempotent)
ALTER TABLE image ADD COLUMN IF NOT EXISTS is_edit BOOLEAN DEFAULT FALSE;
ALTER TABLE image ADD COLUMN IF NOT EXISTS original_image_id INTEGER REFERENCES image(id) ON DELETE SET NULL;
ALTER TABLE image ADD COLUMN IF NOT EXISTS edit_prompt TEXT;
ALTER TABLE image ADD COLUMN IF NOT EXISTS input_image_path TEXT;

-- Create index on is_edit for faster filtering
CREATE INDEX IF NOT EXISTS idx_image_is_edit ON image(is_edit);

-- Create index on original_image_id for relationship lookups
CREATE INDEX IF NOT EXISTS idx_image_original_id ON image(original_image_id);

-- Add comments for documentation
COMMENT ON COLUMN image.is_edit IS 'True if this image is result of editing/variation from another image';
COMMENT ON COLUMN image.original_image_id IS 'FK to original image (if this is an edit)';
COMMENT ON COLUMN image.edit_prompt IS 'Prompt used for editing operation';
COMMENT ON COLUMN image.input_image_path IS 'Path to original input image used for editing';

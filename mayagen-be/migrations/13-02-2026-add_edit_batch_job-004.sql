-- Create edit_batch_job table for bulk image editing
CREATE TABLE IF NOT EXISTS edit_batch_job (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    original_image_id INTEGER NOT NULL REFERENCES image(id) ON DELETE CASCADE,
    original_image_url VARCHAR NOT NULL,
    total_variations INTEGER NOT NULL,
    edit_prompts JSONB NOT NULL DEFAULT '[]',
    model VARCHAR NOT NULL DEFAULT 'FLUX.1-Kontext-pro',
    provider VARCHAR NOT NULL DEFAULT 'azure',
    width INTEGER NOT NULL DEFAULT 512,
    height INTEGER NOT NULL DEFAULT 512,
    status VARCHAR NOT NULL DEFAULT 'QUEUED',
    generated_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    share_token VARCHAR UNIQUE,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_edit_batch_job_user_id ON edit_batch_job(user_id);
CREATE INDEX IF NOT EXISTS ix_edit_batch_job_status ON edit_batch_job(status);
CREATE INDEX IF NOT EXISTS ix_edit_batch_job_share_token ON edit_batch_job(share_token);

-- Add edit_batch_job_id to image table
ALTER TABLE image ADD COLUMN IF NOT EXISTS edit_batch_job_id INTEGER REFERENCES edit_batch_job(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_image_edit_batch_job_id ON image(edit_batch_job_id);

-- Add variations and base_prompt_template to edit_batch_job for wizard support
ALTER TABLE edit_batch_job ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '{}';
ALTER TABLE edit_batch_job ADD COLUMN IF NOT EXISTS base_prompt_template VARCHAR;

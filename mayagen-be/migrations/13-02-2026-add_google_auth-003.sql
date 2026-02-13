-- Add google_id and avatar_url to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;

-- Make hashed_password optional
ALTER TABLE "user" ALTER COLUMN hashed_password DROP NOT NULL;

-- Add index for google_id
CREATE INDEX IF NOT EXISTS ix_user_google_id ON "user" (google_id);

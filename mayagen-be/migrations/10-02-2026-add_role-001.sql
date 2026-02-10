-- Migration: Add Role column and promote user
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';
UPDATE "user" SET role='admin' WHERE id=(SELECT id FROM "user" ORDER BY id ASC LIMIT 1);

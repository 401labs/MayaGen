-- Add share_token column to batchjob
ALTER TABLE batchjob ADD COLUMN share_token VARCHAR;
CREATE UNIQUE INDEX ix_batchjob_share_token ON batchjob (share_token);

-- Add favorites support to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create index for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_files_favorite ON files(owner_id, is_favorite) WHERE is_favorite = TRUE;
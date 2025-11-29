-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#B8E6D5',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add folder_id to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Enable RLS on folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Users can view own folders"
ON folders FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own folders"
ON folders FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own folders"
ON folders FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own folders"
ON folders FOR DELETE
USING (auth.uid() = owner_id);

-- Update trigger for folders
CREATE OR REPLACE FUNCTION update_folder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folders_updated_at
BEFORE UPDATE ON folders
FOR EACH ROW
EXECUTE FUNCTION update_folder_updated_at();
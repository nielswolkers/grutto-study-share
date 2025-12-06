-- Add soft delete columns to files table
ALTER TABLE public.files 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN deleted_by UUID DEFAULT NULL;

-- Add soft delete columns to folders table
ALTER TABLE public.folders
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN deleted_by UUID DEFAULT NULL;

-- Update RLS policies to exclude soft-deleted items from normal queries
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
CREATE POLICY "Users can view own files" 
ON public.files 
FOR SELECT 
USING (auth.uid() = owner_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view shared files" ON public.files;
CREATE POLICY "Users can view shared files" 
ON public.files 
FOR SELECT 
USING (deleted_at IS NULL AND EXISTS ( SELECT 1
   FROM file_shares
  WHERE ((file_shares.file_id = files.id) AND (file_shares.shared_with_user_id = auth.uid()))));

-- Policy to view own deleted files (for trash view)
CREATE POLICY "Users can view own deleted files" 
ON public.files 
FOR SELECT 
USING (auth.uid() = owner_id AND deleted_at IS NOT NULL);

-- Update folder policies
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
CREATE POLICY "Users can view own folders" 
ON public.folders 
FOR SELECT 
USING (auth.uid() = owner_id AND deleted_at IS NULL);

-- Policy to view own deleted folders (for trash view)
CREATE POLICY "Users can view own deleted folders" 
ON public.folders 
FOR SELECT 
USING (auth.uid() = owner_id AND deleted_at IS NOT NULL);
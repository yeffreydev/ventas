-- Add image_url to workspaces
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS image_url text;

-- Create workspace-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-images', 'workspace-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for workspace-images
-- Enable RLS (buckets generally don't need this explicit enable if inherited, but good practice for tables)
-- Policies for storage.objects

-- Allow public access to view workspace images
CREATE POLICY "Public can view workspace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-images');

-- Allow authenticated users to upload workspace images
CREATE POLICY "Authenticated users can upload workspace images"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'workspace-images');

-- Allow authenticated users to update their own workspace images (conceptually)
-- Since objects don't strictly link to workspace owner easily without join, 
-- we often allow auth users to update if they uploaded it or just generic auth for this bucket if acceptable.
-- For stricter security, we would need to check workspace ownership. 
-- However, storage policies on Supabase are often user-based (owner = auth.uid()).
-- Let's stick to standard "Users can update their own uploads" pattern.
CREATE POLICY "Users can update their own workspace images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'workspace-images' AND owner = auth.uid())
WITH CHECK (bucket_id = 'workspace-images' AND owner = auth.uid());

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own workspace images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workspace-images' AND owner = auth.uid());

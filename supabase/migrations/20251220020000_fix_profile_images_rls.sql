-- Fix RLS policies for profiles-images storage bucket
-- This allows authenticated users to upload and manage their own profile images

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public profile images are viewable by everyone" ON storage.objects;

-- Allow authenticated users to INSERT (upload) their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles-images'
  AND (storage.foldername(name))[1] = 'users'
);

-- Allow authenticated users to UPDATE their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles-images'
  AND (storage.foldername(name))[1] = 'users'
)
WITH CHECK (
  bucket_id = 'profiles-images'
  AND (storage.foldername(name))[1] = 'users'
);

-- Allow authenticated users to DELETE their own profile images
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles-images'
  AND (storage.foldername(name))[1] = 'users'
);

-- Allow everyone to SELECT (view) profile images (they're public)
CREATE POLICY "Public profile images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profiles-images');

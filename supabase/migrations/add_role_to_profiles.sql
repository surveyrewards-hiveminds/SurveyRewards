-- Add 'role' column to profiles table
ALTER TABLE public.profiles
ADD COLUMN role text NULL DEFAULT 'user';

-- Will add superadmin role manually

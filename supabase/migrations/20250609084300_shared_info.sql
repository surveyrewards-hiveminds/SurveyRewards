-- This migration adds a new column `shared_info` to the `profiles` table
ALTER TABLE profiles
ADD COLUMN shared_info jsonb;

-- This migration adds a new column `required_info` to the `surveys` table
ALTER TABLE surveys
ADD COLUMN required_info jsonb;
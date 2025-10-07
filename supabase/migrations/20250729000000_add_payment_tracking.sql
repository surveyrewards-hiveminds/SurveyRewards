/*
  # Add payment tracking to surveys table

  1. Changes
    - Add `payment_status` enum column to track payment state
    - Add `payment_amount` to store the total amount paid
    - Add `paid_at` timestamp for when payment was completed
    
  2. Payment Status Values
    - 'pending': Survey created but payment not yet completed
    - 'paid': Payment successfully processed
    - 'failed': Payment attempt failed
*/

-- Create payment status enum
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed');

-- Add payment tracking columns to surveys table
ALTER TABLE surveys 
ADD COLUMN payment_status payment_status_enum DEFAULT 'pending',
ADD COLUMN payment_amount numeric DEFAULT 0,
ADD COLUMN paid_at timestamptz;

-- Add index for payment status queries
CREATE INDEX idx_surveys_payment_status ON surveys(payment_status);

-- Add index for paid surveys
CREATE INDEX idx_surveys_paid_at ON surveys(paid_at) WHERE paid_at IS NOT NULL;

-- Update existing surveys to have 'paid' status if they're live or finished
-- (assuming existing surveys were already paid for)
UPDATE surveys 
SET payment_status = 'paid', 
    paid_at = created_at 
WHERE status IN ('live', 'finished');

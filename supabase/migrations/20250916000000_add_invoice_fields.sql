-- Add invoice fields to credit_transactions table
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

-- Add index for invoice number for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_invoice_number 
ON credit_transactions(invoice_number);

-- Add constraint to ensure invoice number is unique when not null
ALTER TABLE credit_transactions 
ADD CONSTRAINT unique_invoice_number 
UNIQUE (invoice_number);

-- Create invoices storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policy for invoices bucket
CREATE POLICY "Users can view their own invoices" ON storage.objects
FOR SELECT USING (
  bucket_id = 'invoices' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role can insert invoices" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Service role can update invoices" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' AND
  auth.role() = 'service_role'
);
-- Add verification status and timestamp to profiles table
ALTER TABLE profiles
ADD COLUMN veriff_session_id UUID
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verified_at TIMESTAMP;

-- Create veriff_logs table to track all Veriff payloads and events
create table veriff_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  veriff_session_id uuid,
  event_type text not null, -- e.g. 'session_created', 'webhook_update'
  payload jsonb not null,
  created_at timestamp with time zone default now()
);

create index on veriff_logs (veriff_session_id);
create index on veriff_logs (profile_id);

-- Enable Row Level Security
alter table veriff_logs enable row level security;

-- Allow authenticated users to insert (create) and select (read) their own logs
create policy "Authenticated users can insert veriff logs" on veriff_logs
  for insert to authenticated
  with check (auth.uid()::uuid = profile_id);

create policy "Authenticated users can read their veriff logs" on veriff_logs
  for select to authenticated
  using (auth.uid()::uuid = profile_id);
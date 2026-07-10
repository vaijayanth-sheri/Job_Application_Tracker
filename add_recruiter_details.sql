-- Add recruiter_details to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_details TEXT DEFAULT '';

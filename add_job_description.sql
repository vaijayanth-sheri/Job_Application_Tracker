-- Run this in your Supabase SQL Editor to add the persistent memory column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_description text;

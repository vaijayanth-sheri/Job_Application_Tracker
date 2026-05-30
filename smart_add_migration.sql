-- ============================================
-- Smart Add Feature Migration
-- ============================================

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  resume_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 2. Modify jobs.relevancy column to be an integer (0-100)
-- First, drop the existing check constraint on relevancy
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_relevancy_check;

-- Drop the string default value before casting
ALTER TABLE jobs ALTER COLUMN relevancy DROP DEFAULT;

-- We need to handle existing data. We can convert 'high' to 90, 'medium' to 50, 'low' to 10
-- We use a USING clause to cast existing string values to integers based on this mapping
ALTER TABLE jobs 
  ALTER COLUMN relevancy TYPE INTEGER 
  USING CASE 
    WHEN relevancy = 'high' THEN 90
    WHEN relevancy = 'medium' THEN 50
    WHEN relevancy = 'low' THEN 10
    ELSE 0
  END;

-- Add new constraint for 0-100
ALTER TABLE jobs ADD CONSTRAINT jobs_relevancy_check CHECK (relevancy >= 0 AND relevancy <= 100);

-- Update the default value
ALTER TABLE jobs ALTER COLUMN relevancy SET DEFAULT 0;

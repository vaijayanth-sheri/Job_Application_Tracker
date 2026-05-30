-- ============================================
-- Job Application Tracker - AI Settings Schema
-- ============================================

-- Create the ai_settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  base_cv TEXT DEFAULT '',
  cover_letter_guidelines TEXT DEFAULT '',
  formatting_rules TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_row_per_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies for ai_settings
CREATE POLICY "Users can view their own ai_settings"
  ON ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai_settings"
  ON ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_settings"
  ON ai_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai_settings"
  ON ai_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at using existing function
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);

-- ==================
-- QUICK NOTES TABLE
-- ==================
CREATE TABLE IF NOT EXISTS quick_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- ROW LEVEL SECURITY
-- ==================

-- Enable RLS
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own quick_notes"
  ON quick_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick_notes"
  ON quick_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick_notes"
  ON quick_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick_notes"
  ON quick_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ==================
-- AUTO-UPDATE updated_at
-- ==================
CREATE TRIGGER update_quick_notes_updated_at
  BEFORE UPDATE ON quick_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================
-- INDEXES
-- ==================
CREATE INDEX IF NOT EXISTS idx_quick_notes_user_id ON quick_notes(user_id);

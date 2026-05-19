-- ============================================
-- Autonomous Ingestion Logs - Migration Script
-- ============================================
-- Run this in your Supabase SQL Editor to create the
-- tracking table required for the external Codex agent.
-- ============================================

CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We do not enable Row Level Security on this table 
-- because the Next.js API uses the Supabase Service Role Key 
-- to write logs autonomously, completely bypassing RLS.

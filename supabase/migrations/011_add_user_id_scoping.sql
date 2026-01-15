-- Migration: Add user_id scoping to records
-- Goal: Prevent cross-user data leakage inside same tenant.

-- Add user_id to conversations
ALTER TABLE IF EXISTS conversations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Add user_id to financeiro
ALTER TABLE IF EXISTS financeiro
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financeiro_user_id ON financeiro(user_id);

-- Add user_id to compromissos
ALTER TABLE IF EXISTS compromissos
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compromissos_user_id ON compromissos(user_id);

-- NOTE:
-- Existing rows will have user_id = NULL. They will no longer appear in user-scoped queries.
-- If you want to backfill, do it explicitly with your own rules.


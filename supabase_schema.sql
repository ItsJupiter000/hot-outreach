-- ============================================================
-- OutreachBot – Supabase Schema
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  template_id UUID,
  status TEXT NOT NULL DEFAULT 'Applied',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  history JSONB NOT NULL DEFAULT '[]'
);

-- Documents (metadata only; file stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow full access via the anon/publishable key (no auth required)
DROP POLICY IF EXISTS "allow_all_templates" ON templates;
CREATE POLICY "allow_all_templates" ON templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_applications" ON applications;
CREATE POLICY "allow_all_applications" ON applications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_documents" ON documents;
CREATE POLICY "allow_all_documents" ON documents FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for uploaded documents/resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "allow_all_storage" ON storage.objects;
CREATE POLICY "allow_all_storage" ON storage.objects
  FOR ALL USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY, -- 'global'
  follow_ups_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scheduling_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reply_polling_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  follow_up_interval_minutes INTEGER NOT NULL DEFAULT 60,
  scheduling_interval_minutes INTEGER NOT NULL DEFAULT 360,
  reply_polling_interval_minutes INTEGER NOT NULL DEFAULT 5,
  follow_up_template_id UUID REFERENCES templates(id),
  follow_up_days INTEGER NOT NULL DEFAULT 4,
  last_follow_up_at TIMESTAMPTZ,
  last_scheduling_at TIMESTAMPTZ,
  last_reply_polling_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default global settings
INSERT INTO settings (id, follow_ups_enabled, scheduling_enabled, reply_polling_enabled, follow_up_interval_minutes, scheduling_interval_minutes, reply_polling_interval_minutes)
VALUES ('global', true, true, true, 60, 360, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_settings" ON settings;
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);

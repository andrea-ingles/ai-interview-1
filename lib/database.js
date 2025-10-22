import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
//const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Database schema setup SQL (run in Supabase SQL editor):
/*
-- Create interviews table
CREATE TABLE interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL,
  analysis_prompts JSONB NOT NULL,
  next_steps TEXT,
  time_limit INTEGER DEFAULT 120,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create candidates table
CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID REFERENCES interviews(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(255),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create responses table
CREATE TABLE responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id),
  question_index INTEGER NOT NULL,
  video_url TEXT,
  transcription TEXT,
  ai_analysis JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-videos', 'interview-videos', false);

-- Create storage policy
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'interview-videos');

CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'interview-videos');
*/
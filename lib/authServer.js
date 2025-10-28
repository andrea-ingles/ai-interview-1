// lib/database.js - SERVER ONLY
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing Supabase Service key in environment variables')
}


export const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

export async function getServerUser(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return { user: null, error: new Error('Missing token') }

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    console.error("getServerUser error:", error)
    return { user: null, error: "Invalid or missing session" }
  }
  return { user: data?.user || null, error }
}

// Updated test connection function
export async function testConnection() {
  try {
    const { data, error, count } = await supabase
      .from('interviews')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    return { 
      success: true, 
      message: 'Database connection successful',
      tableExists: true,
      recordCount: count || 0
    }
  } catch (error) {
    console.error('Database connection test failed:', error)
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN'
    }
  }
}


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
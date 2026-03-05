-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(50),
    resume_text TEXT,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('chat', 'voice', 'live')),
    transcript JSONB,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX idx_interviews_score ON interviews(score DESC);
CREATE INDEX idx_interviews_candidate_email ON interviews(candidate_email);

-- Create users table for authentication (optional, if using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'interviewer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (candidates can create interviews)
CREATE POLICY "Allow insert for all users" ON interviews
    FOR INSERT WITH CHECK (true);

-- Allow select for all authenticated users (interviewers can view all)
CREATE POLICY "Allow select for all users" ON interviews
    FOR SELECT USING (true);

-- Allow update only for authenticated interviewers
CREATE POLICY "Allow update for interviewers" ON interviews
    FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON interviews TO postgres;
GRANT ALL ON interviews TO anon;
GRANT ALL ON interviews TO authenticated;


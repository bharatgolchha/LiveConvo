-- Create beta_waitlist table for early access program
CREATE TABLE IF NOT EXISTS beta_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL,
  use_case TEXT NOT NULL CHECK (use_case IN ('sales', 'consulting', 'hiring', 'support', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'invited')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_email ON beta_waitlist(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_status ON beta_waitlist(status);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_created_at ON beta_waitlist(created_at);

-- Add RLS (Row Level Security) if needed
ALTER TABLE beta_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for signup)
CREATE POLICY "Allow public to insert waitlist entries" ON beta_waitlist
  FOR INSERT WITH CHECK (true);

-- Only allow authenticated users to read/update (for admin dashboard)
CREATE POLICY "Allow authenticated users to read waitlist" ON beta_waitlist
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update waitlist" ON beta_waitlist
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beta_waitlist_updated_at 
  BEFORE UPDATE ON beta_waitlist 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 
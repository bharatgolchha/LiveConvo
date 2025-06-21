# Beta Waitlist Database Setup

## Problem
The beta waitlist form is failing with a Row Level Security (RLS) error because the `beta_waitlist` table doesn't exist in your Supabase database yet.

## Quick Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `ucvfgfbjcrxbzppwjpuu`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy and paste the following SQL:

```sql
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_email ON beta_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_status ON beta_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_created_at ON beta_waitlist(created_at);

-- Enable RLS but allow public access for signups
ALTER TABLE beta_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for beta signups)
CREATE POLICY "Allow public to insert waitlist entries" ON beta_waitlist
  FOR INSERT WITH CHECK (true);

-- Only allow authenticated users to read/update (for admin management)
CREATE POLICY "Allow authenticated users to read waitlist" ON beta_waitlist
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update waitlist" ON beta_waitlist
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger to automatically update the updated_at timestamp
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
```

4. **Click "Run"** to execute the migration

### Option 2: Alternative (If RLS Issues Persist)

If you continue to have RLS issues, you can temporarily disable RLS for testing:

```sql
-- Temporarily disable RLS for easier testing
ALTER TABLE beta_waitlist DISABLE ROW LEVEL SECURITY;
```

## Verification

After running the migration, test the waitlist form:

1. Go to your landing page (`http://localhost:3000/landing`)
2. Scroll to the "Join the Early Access Program" section
3. Fill out the form with test data
4. Submit the form

If it works, you should see "Application Submitted!" message.

## Viewing Waitlist Entries

To see the beta signups in Supabase:

1. Go to "Table Editor" in your Supabase dashboard
2. Look for the `beta_waitlist` table
3. You'll see all the beta signup entries there

## Database Schema

The `beta_waitlist` table includes:
- `id`: Unique identifier
- `name`: User's full name
- `email`: User's email (unique)
- `company`: User's company name
- `use_case`: Their primary use case ('sales', 'consulting', 'hiring', 'support', 'other')
- `status`: Application status ('pending', 'approved', 'rejected', 'invited')
- `notes`: Admin notes (optional)
- `created_at`: When they signed up
- `updated_at`: Last modified timestamp

## Next Steps

Once the table is created and working:
1. ✅ Test the waitlist form submission
2. ✅ Check entries appear in Supabase dashboard
3. 🔄 Set up email notifications (optional)
4. 🔄 Create admin dashboard to manage applications (optional) 
-- Add guest support to report_comments table
ALTER TABLE report_comments
ADD COLUMN IF NOT EXISTS guest_id TEXT,
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Create index for guest comments
CREATE INDEX IF NOT EXISTS idx_report_comments_guest_id ON report_comments(guest_id) WHERE guest_id IS NOT NULL;

-- Update the check constraint to allow either user_id or guest_id
ALTER TABLE report_comments DROP CONSTRAINT IF EXISTS report_comments_user_check;
ALTER TABLE report_comments ADD CONSTRAINT report_comments_user_check 
CHECK ((user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL));

-- Create a view for comments with user/guest info
CREATE OR REPLACE VIEW report_comments_with_authors AS
SELECT 
  rc.*,
  COALESCE(u.full_name, u.email, rc.guest_name) as author_name,
  CASE 
    WHEN rc.user_id IS NOT NULL THEN 'user'
    ELSE 'guest'
  END as author_type,
  u.email as author_email
FROM report_comments rc
LEFT JOIN users u ON rc.user_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON report_comments_with_authors TO anon;
GRANT SELECT ON report_comments_with_authors TO authenticated;

-- Create RLS policy for guest comments on shared reports
CREATE POLICY "Guest users can view comments on shared reports" ON report_comments
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM shared_reports sr
    WHERE sr.session_id = report_comments.session_id
    AND sr.expires_at > NOW()
  )
);

-- Create RLS policy for guest users to manage their own comments
CREATE POLICY "Guest users can manage their own comments" ON report_comments
FOR ALL
TO anon
USING (
  guest_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM shared_reports sr
    WHERE sr.session_id = report_comments.session_id
    AND sr.expires_at > NOW()
  )
)
WITH CHECK (
  guest_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM shared_reports sr
    WHERE sr.session_id = report_comments.session_id
    AND sr.expires_at > NOW()
  )
);
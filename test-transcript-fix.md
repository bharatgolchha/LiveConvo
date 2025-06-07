# Transcript RLS Policy Fix - Test Guide

## Issue Summary
The transcript saving was failing with a row-level security (RLS) policy violation because the POST endpoint in `/api/sessions/[id]/transcript` was using an unauthenticated Supabase client.

## Root Cause
The transcript POST endpoint was using the generic `supabase` client instead of an authenticated client that respects RLS policies. The RLS policy on the transcripts table requires that:
- Users can only create transcripts for sessions in their organization
- The policy checks: `session_id IN (SELECT id FROM sessions WHERE organization_id = (SELECT current_organization_id FROM users WHERE id = auth.uid()))`

## Fix Applied
Updated the POST endpoint in `/src/app/api/sessions/[id]/transcript/route.ts` to:
1. Extract and validate the authentication token from the request
2. Verify the user is authenticated
3. Check that the user has a current_organization_id
4. Verify the session belongs to the user's organization
5. Use `createAuthenticatedSupabaseClient(token)` for all database operations

## Changes Made
- Added authentication checks at the beginning of the POST function
- Replaced all instances of `supabase` with `authClient` in the POST function
- This ensures all database operations respect RLS policies

## Testing Steps
1. Start a new recording session
2. Speak for a few seconds to generate transcript data
3. Check the browser console for transcript save logs
4. Verify that transcripts are being saved successfully without RLS errors
5. Check the network tab to ensure the `/api/sessions/[id]/transcript` POST requests return 201 status

## Expected Results
- Transcript saves should succeed with a 201 status
- Console should show "✅ Transcript saved successfully" messages
- No RLS policy violation errors should appear

## Verification Query
You can run this query in Supabase to verify transcripts are being saved:
```sql
SELECT 
  t.id,
  t.session_id,
  t.content,
  t.speaker,
  t.sequence_number,
  t.created_at,
  s.title as session_title,
  s.organization_id
FROM transcripts t
JOIN sessions s ON t.session_id = s.id
WHERE s.user_id = auth.uid()
ORDER BY t.created_at DESC
LIMIT 10;
```
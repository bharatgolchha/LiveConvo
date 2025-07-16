# Production Real-time Setup for Supabase

## 1. Enable Real-time on Sessions Table

Run this SQL in your production Supabase SQL editor:

```sql
-- Enable real-time on the sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Verify it's enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'sessions';
```

## 2. Verify Table Configuration

```sql
-- Check replica identity (should be 'default' or 'full')
SELECT relreplident 
FROM pg_class 
WHERE relname = 'sessions';

-- If needed, set replica identity
ALTER TABLE sessions REPLICA IDENTITY DEFAULT;
```

## 3. Environment Variables for Production

Make sure these are set in your production environment (Vercel):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xkxjycccifwyxgtvflxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your production anon key]
SUPABASE_SERVICE_ROLE_KEY=[Your production service role key]
```

## 4. Real-time Configuration

The real-time implementation will work automatically in production with the same code. The key differences:

- Production database ID: `xkxjycccifwyxgtvflxz`
- Production URL: `https://xkxjycccifwyxgtvflxz.supabase.co`
- Uses production auth tokens

## 5. Testing Production Real-time

After deployment:

1. Open the production dashboard
2. Check for "Real-time: Connected" indicator
3. Create/update a session in another tab
4. Verify dashboard updates automatically

## 6. Monitoring

Check Supabase dashboard for:
- Real-time connections count
- WebSocket health
- Any error logs in the Realtime logs

## 7. Troubleshooting

If real-time doesn't work in production:

1. Check if the table is in the publication:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. Check real-time logs in Supabase dashboard

3. Verify RLS policies allow reading sessions

4. Check browser console for WebSocket errors

## Notes

- The same code works for both dev and production
- Real-time connections are region-specific (us-west-1 for production)
- WebSocket connections may be blocked by corporate firewalls
- Real-time has a default limit of 200 concurrent connections per project
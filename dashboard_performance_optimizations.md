# Dashboard Performance Optimizations

## Summary of Changes

The dashboard was experiencing significant performance issues due to multiple redundant API calls. Here's what was optimized:

### 1. **Unified Data Fetching**
- Removed the fallback mechanism in `useDashboardDataWithFallback` that was causing 3+ API calls (sessions, stats, subscription) on every page load
- Now uses the unified `/api/dashboard/data` endpoint exclusively, fetching all data in a single request

### 2. **Request Deduplication**
- The `useDashboardData` hook already implements request deduplication using a `pendingRequests` Map
- Prevents multiple simultaneous requests with the same parameters

### 3. **Caching Headers**
- Both `/api/dashboard/data` and `/api/sessions` endpoints have proper cache headers:
  ```
  Cache-Control: public, s-maxage=30, stale-while-revalidate=120
  ```
- This caches responses at the edge for 30 seconds and allows stale content for 2 minutes while revalidating

### 4. **Optimized Dependencies**
- Fixed the dashboard page's useEffect dependencies to prevent unnecessary re-fetches
- Removed `fetchDashboardData`, `user`, and `authSession` from dependencies
- Now only re-fetches when actual filters change (`activePath` or `debouncedSearchQuery`)

### 5. **Parallel Data Fetching**
- The `/api/dashboard/data` endpoint uses `Promise.allSettled` to fetch sessions, stats, and subscription data in parallel
- Gracefully handles partial failures

## Performance Impact

**Before:**
- 3+ API calls on dashboard mount (`/api/sessions`, `/api/users/stats-v2`, `/api/users/subscription`)
- Multiple redundant calls during navigation
- No request deduplication
- Re-fetches on every auth state change

**After:**
- Single API call to `/api/dashboard/data` on mount
- Request deduplication prevents redundant calls
- 30-second edge caching reduces server load
- Only re-fetches when filters actually change

## Monitoring

To verify the improvements:
1. Check the browser's Network tab - you should see only one call to `/api/dashboard/data` on initial load
2. Navigating between tabs should not trigger new API calls unless the filter changes
3. The dashboard should load significantly faster, especially on subsequent visits due to caching
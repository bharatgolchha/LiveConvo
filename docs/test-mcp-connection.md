# MCP Connection Test Guide

Use these test queries with your AI assistant to verify that Supabase MCP is working correctly:

## Basic Connection Test
```
What tables are available in my LiveConvo database?
```
**Expected**: List of tables like `sessions`, `transcripts`, `users`, `organizations`, `summaries`, etc.

## Schema Exploration
```
Describe the structure of the sessions table including its columns and relationships.
```
**Expected**: Detailed schema with columns like `id`, `title`, `conversation_type`, `recording_started_at`, etc.

## Data Insights
```
Show me the relationship between the sessions and transcripts tables.
```
**Expected**: Explanation of foreign key relationship via `session_id`

## LiveConvo-Specific Queries
```
How many sessions have been created in the last 30 days?
```
**Expected**: A SQL query and/or count

```
What are the different conversation types available in the system?
```
**Expected**: Analysis of `conversation_type` values from sessions table

```
Explain the usage tracking implementation in LiveConvo.
```
**Expected**: Description of `usage_tracking` and `monthly_usage_cache` tables

## Advanced Analysis
```
Generate a query to find the most active users based on session count.
```
**Expected**: SQL query using sessions table grouped by user_id

```
What's the average session duration for completed sessions?
```
**Expected**: Query using `recording_duration_seconds` from sessions table

## If Tests Fail

1. **No response about tables**: MCP server not connected
   - Check token in `.cursor/mcp.json`
   - Verify green status in Cursor Settings > MCP

2. **Permission errors**: Token lacks required scopes
   - Regenerate token with broader permissions

3. **Connection timeout**: Network or Supabase issues
   - Check internet connection
   - Verify Supabase project is active

## Success Indicators

✅ AI can list all database tables
✅ AI understands table relationships
✅ AI can generate accurate SQL queries
✅ AI provides insights about your LiveConvo data
✅ AI responds with database-specific context

Once these tests pass, your MCP integration is working correctly! 
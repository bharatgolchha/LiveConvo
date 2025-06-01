# Supabase MCP (Model Context Protocol) Setup Guide

## Overview

This guide shows you how to connect your LiveConvo Supabase database to AI tools like Cursor IDE using the Model Context Protocol (MCP). With MCP configured, your AI assistant can automatically access and query your database without manual context feeding.

## What is MCP?

The Model Context Protocol (MCP) is a standard for connecting Large Language Models (LLMs) to external data sources like databases. Think of it as a "universal adapter" that allows AI tools to securely access your Supabase database and understand your schema, tables, and data.

### Benefits for LiveConvo:
- 🔄 **Automatic Context**: AI can access sessions, transcripts, users, and usage data automatically
- 🚀 **Enhanced Development**: Get intelligent suggestions based on your actual database schema
- 📊 **Smart Queries**: AI can write complex SQL queries for analytics and insights
- 🛠️ **Better Debugging**: AI understands your data structure for more accurate troubleshooting

## Step 1: Create a Supabase Personal Access Token (PAT)

1. **Go to Supabase Dashboard**
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your LiveConvo project (`ucvfgfbjcrxbzppwjpuu`)

2. **Create Personal Access Token**
   - Navigate to **Settings** → **Access Tokens**
   - Click **Generate new token**
   - Name: `LiveConvo-MCP-Server`
   - Scopes: Select **All** or at minimum:
     - `projects:read`
     - `schemas:read`
     - `tables:read`
     - `sql:execute`
   - Click **Generate token**
   - **⚠️ IMPORTANT**: Copy the token immediately - you won't see it again!

## Step 2: Configure MCP for Your AI Tool

### For Cursor IDE (Recommended)

1. **Update MCP Configuration**
   - The `.cursor/mcp.json` file has been created in your project root
   - Replace `<SUPABASE_PERSONAL_ACCESS_TOKEN>` with your actual token:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_ACTUAL_TOKEN_HERE"
      ]
    }
  }
}
```

2. **Verify Connection**
   - Open Cursor IDE
   - Go to **Settings** → **MCP**
   - You should see a green active status for the Supabase server
   - If red, check your token and internet connection

### For Other AI Tools

<details>
<summary>Click to expand configurations for other tools</summary>

#### Windsurf (Codium)
1. Open Windsurf and navigate to the Cascade assistant
2. Tap on the hammer (MCP) icon, then **Configure**
3. Add the same configuration as above
4. Save and tap **Refresh**

#### Visual Studio Code (Copilot)
1. Create `.vscode/mcp.json` in your project root
2. Use this configuration:
```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "supabase-access-token",
      "description": "Supabase personal access token",
      "password": true
    }
  ],
  "servers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${input:supabase-access-token}"
      }
    }
  }
}
```

#### Claude Desktop
1. Open Claude desktop → **Settings** → **Developer** → **Edit Config**
2. Add the same configuration as Cursor
3. Restart Claude desktop

</details>

## Step 3: Test Your MCP Connection

1. **Basic Test**
   - Ask your AI: *"What tables do I have in my LiveConvo database?"*
   - Expected response: List of tables like `sessions`, `transcripts`, `users`, `organizations`, etc.

2. **Schema Exploration**
   - Ask: *"Describe the structure of the sessions table"*
   - Expected response: Column details, types, relationships

3. **Data Insights**
   - Ask: *"How many active sessions do I have this month?"*
   - Expected response: A SQL query and/or actual count

## Step 4: Security Best Practices

### Token Security
- ✅ **Never commit tokens to git** - tokens are in `.cursor/mcp.json` which should be gitignored
- ✅ **Use minimal required scopes** - don't grant more permissions than needed
- ✅ **Rotate tokens regularly** - create new tokens periodically and revoke old ones
- ✅ **Monitor usage** - check Supabase logs for unexpected activity

### Access Control
- 🔒 **MCP runs read-only queries** by default
- 🔒 **Verify permissions** in Supabase dashboard under API settings
- 🔒 **Use organization-level tokens** if working in a team

## Step 5: LiveConvo-Specific Use Cases

With MCP configured, you can now ask your AI assistant about:

### Database Schema
- *"Show me the relationship between sessions and transcripts"*
- *"What are the main tables in LiveConvo and their purposes?"*
- *"Explain the usage tracking implementation"*

### Data Analysis
- *"Find sessions with the most transcript activity"*
- *"Show me user engagement patterns"*
- *"Which organizations are using the most minutes?"*

### Development Tasks
- *"Help me write a query to get all sessions for a specific user"*
- *"Generate an API endpoint to fetch session summaries"*
- *"Create a migration to add a new field to the transcripts table"*

### Debugging
- *"Why might some sessions not have summaries?"*
- *"Check if there are any orphaned transcript records"*
- *"Analyze the minute tracking data for inconsistencies"*

## Troubleshooting

### Common Issues

**🔴 MCP Server Not Active (Red Status)**
- Check internet connection
- Verify your Personal Access Token is correct
- Ensure you have the required scopes enabled
- Try regenerating the token

**🔴 AI Can't Access Database**
- Confirm the token has `sql:execute` permission
- Check if your Supabase project is active
- Verify the project reference in the token matches your project

**🔴 Permission Denied Errors**
- Review token scopes in Supabase dashboard
- Ensure you're the project owner or have sufficient permissions
- Try creating a new token with broader scopes

### Getting Help

If you encounter issues:
1. Check the [Supabase MCP documentation](https://supabase.com/docs/guides/getting-started/mcp)
2. Review Cursor's MCP settings and logs
3. Test with a simple query first before complex requests
4. Verify your Supabase project is accessible via the web dashboard

## Benefits You'll Experience

Once MCP is working, you'll notice:

✅ **Faster Development**: AI understands your database structure instantly
✅ **Smarter Suggestions**: Code completions are based on your actual schema
✅ **Better Debugging**: AI can analyze your data for issues
✅ **Enhanced Analytics**: Generate insights from your LiveConvo data
✅ **Reduced Context Switching**: No need to manually copy-paste schema information

## Security Note

The MCP server connects to your Supabase cloud database with read access by default. For local development with a local Supabase instance, you can use the Postgres MCP server instead:

```json
{
  "mcpServers": {
    "supabase-local": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://postgres:postgres@localhost:54322/postgres"]
    }
  }
}
```

---

**Next Steps**: With MCP configured, try asking your AI assistant questions about your LiveConvo database structure and data. The AI will now have direct access to understand and help you work with your database more effectively! 
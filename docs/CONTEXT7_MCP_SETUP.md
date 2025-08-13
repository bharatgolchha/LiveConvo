### Context7 MCP Setup (Cursor, Claude, VS Code)

Context7 provides up-to-date library docs to your AI assistant via MCP.

Install in Cursor (recommended):

1) Ensure Node.js v18+.
2) Cursor will auto-detect `.cursor/mcp.json` added in this repo.
3) Restart Cursor. In a chat, ask: "use context7: get docs for /vercel/next.js on routing".

Manual Cursor config (if needed):

Create or update `.cursor/mcp.json` with:

```json
{
  "mcpServers": {
    "Context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Auto-invoke rule (Cursor/Windsurf): `.windsurfrules` is included to trigger Context7 when asking for setup, examples, or docs.

Claude Desktop:

Copy `claude-mcp-config.json` into Claude settings (Developer > Edit Config). It now includes `context7` in `mcpServers`.

Troubleshooting:
- If npm resolution fails, try bun: replace command with `bunx` and keep the same args.
- For TLS/module resolution issues, see the Troubleshooting section in the Context7 repo.

Reference: `https://github.com/upstash/context7`








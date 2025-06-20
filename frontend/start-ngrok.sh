#!/bin/bash

# Start ngrok on port 3000
echo "Starting ngrok tunnel for port 3000..."
ngrok http 3000

# After you close ngrok, remind to update the .env.local file
echo ""
echo "Don't forget to update NEXT_PUBLIC_APP_URL in .env.local with your ngrok URL!"
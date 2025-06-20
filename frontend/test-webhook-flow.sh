#!/bin/bash

echo "Testing webhook flow..."

# Get a session ID from the user or use a test one
SESSION_ID="${1:-test-session-123}"
WEBHOOK_URL="https://d352-103-235-197-250.ngrok-free.app/api/webhooks/recall/$SESSION_ID"

echo "Testing webhook URL: $WEBHOOK_URL"

# Test 1: Partial transcript data
echo "Sending partial transcript..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transcript.partial_data",
    "bot": {
      "id": "bot-test-123",
      "metadata": {
        "session_id": "'$SESSION_ID'"
      }
    },
    "data": {
      "data": {
        "words": [
          {
            "text": "This",
            "start_timestamp": { "relative": 1.0 },
            "end_timestamp": { "relative": 1.2 }
          },
          {
            "text": "is",
            "start_timestamp": { "relative": 1.3 },
            "end_timestamp": { "relative": 1.4 }
          },
          {
            "text": "partial",
            "start_timestamp": { "relative": 1.5 },
            "end_timestamp": { "relative": 1.8 }
          }
        ],
        "participant": {
          "id": 1,
          "name": "Test User",
          "is_host": true,
          "platform": "google_meet",
          "extra_data": {}
        }
      }
    }
  }'

echo -e "\n\nWaiting 2 seconds..."
sleep 2

# Test 2: Final transcript data
echo "Sending final transcript..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transcript.data",
    "bot": {
      "id": "bot-test-123",
      "metadata": {
        "session_id": "'$SESSION_ID'"
      }
    },
    "data": {
      "data": {
        "words": [
          {
            "text": "This",
            "start_timestamp": { "relative": 1.0 },
            "end_timestamp": { "relative": 1.2 }
          },
          {
            "text": "is",
            "start_timestamp": { "relative": 1.3 },
            "end_timestamp": { "relative": 1.4 }
          },
          {
            "text": "a",
            "start_timestamp": { "relative": 1.5 },
            "end_timestamp": { "relative": 1.6 }
          },
          {
            "text": "final",
            "start_timestamp": { "relative": 1.7 },
            "end_timestamp": { "relative": 2.0 }
          },
          {
            "text": "transcript",
            "start_timestamp": { "relative": 2.1 },
            "end_timestamp": { "relative": 2.5 }
          },
          {
            "text": "message",
            "start_timestamp": { "relative": 2.6 },
            "end_timestamp": { "relative": 3.0 }
          }
        ],
        "participant": {
          "id": 2,
          "name": "Other User",
          "is_host": false,
          "platform": "google_meet",
          "extra_data": {}
        }
      }
    }
  }'

echo -e "\n\nWebhook tests sent. Check the server logs and browser console for results."
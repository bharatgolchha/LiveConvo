#!/bin/bash

# Test Recall webhook with realistic transcript data
SESSION_ID="your-session-id-here"
WEBHOOK_URL="https://659b-27-34-84-108.ngrok-free.app/api/webhooks/recall/$SESSION_ID"

# Simulate a Recall.ai transcript.data event
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transcript.data",
    "bot": {
      "id": "bot-123456",
      "metadata": {
        "session_id": "'$SESSION_ID'"
      }
    },
    "data": {
      "data": {
        "words": [
          {
            "text": "Hello",
            "start_timestamp": { "relative": 10.5 },
            "end_timestamp": { "relative": 10.8 }
          },
          {
            "text": "this",
            "start_timestamp": { "relative": 10.9 },
            "end_timestamp": { "relative": 11.1 }
          },
          {
            "text": "is",
            "start_timestamp": { "relative": 11.2 },
            "end_timestamp": { "relative": 11.3 }
          },
          {
            "text": "a",
            "start_timestamp": { "relative": 11.4 },
            "end_timestamp": { "relative": 11.5 }
          },
          {
            "text": "test",
            "start_timestamp": { "relative": 11.6 },
            "end_timestamp": { "relative": 11.9 }
          },
          {
            "text": "transcript",
            "start_timestamp": { "relative": 12.0 },
            "end_timestamp": { "relative": 12.5 }
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

echo "Webhook test sent to: $WEBHOOK_URL"
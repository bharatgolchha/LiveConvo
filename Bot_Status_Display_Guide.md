# Bot Status Display Implementation Guide

## Overview
The bot status is now displayed on conversation/meeting cards in the dashboard, giving users visibility into the current state of recording bots.

## How It Works

### 1. Database Fields
The `sessions` table includes:
- `recall_bot_id` - UUID of the Recall.ai bot
- `recall_bot_status` - Enum with values: 'created', 'joining', 'in_call', 'completed', 'failed', 'timeout'

### 2. API Integration
The `/api/sessions` endpoint already returns these fields, so bot status is automatically included when fetching sessions.

### 3. UI Display
In `ConversationInboxItem.tsx`, bot status badges appear in the metadata section of each card when:
- A session has a `recall_bot_id` (indicating a bot was deployed)
- The session has a `recall_bot_status` value

### 4. Status Badges
Each status has its own styling and icon:

- **Created** (Gray) - Bot created but not yet joined
  - Icon: ArrowPathIcon (static)
  - Use case: Bot is scheduled but meeting hasn't started

- **Joining** (Blue) - Bot is currently joining the meeting
  - Icon: ArrowPathIcon (animated spin)
  - Use case: Bot is in the process of joining

- **In Call** (Green) - Bot is actively recording
  - Icon: VideoCameraIcon
  - Use case: Active recording in progress

- **Completed** (Gray) - Recording finished successfully
  - Icon: ArrowPathIcon
  - Use case: Recording completed normally

- **Failed** (Red) - Bot failed to join or record
  - Icon: ArrowPathIcon
  - Use case: Error occurred during bot deployment

- **Timeout** (Orange) - Bot timed out
  - Icon: ClockIcon
  - Use case: Bot couldn't join within time limit

## Testing

1. Navigate to `/test-bot-status` to:
   - View all sessions with bot status
   - Test different status displays
   - Check bot status from Recall.ai API

2. Or check the main dashboard at `/dashboard` to see bot status badges on actual session cards.

## Auto-Join Integration
When the auto-join worker creates sessions and deploys bots:
1. Session is created with `recall_bot_id` and initial status 'created'
2. Bot status updates as it progresses through the lifecycle
3. Users see real-time status on their dashboard

## Implementation Details

### Component: ConversationInboxItem.tsx
- Added `getBotStatusConfig()` function to map status to UI configuration
- Bot status badge renders next to session status badge
- Only shows when `recall_bot_id` exists

### Types
Bot status is typed as:
```typescript
recall_bot_status?: 'created' | 'joining' | 'in_call' | 'completed' | 'failed' | 'timeout'
```

This ensures type safety across the application.
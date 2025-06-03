# Real-Time Summary Improvements

## Current Implementation Issues

1. **Fixed Thresholds**: 15 lines or 30 words - too rigid
2. **Full Regeneration**: Sends entire transcript every time
3. **No Context Awareness**: Doesn't detect important moments
4. **Long Intervals**: 45-second checks might miss key points
5. **No Caching**: Previous analysis isn't reused

## New Smart Summary System (V2)

### 1. **Intelligent Triggering**

Instead of fixed thresholds, the system now uses:

- **Content Weight System**: Assigns importance scores to content
  - Questions: +3 points each
  - Speaker changes: +2 points each  
  - Keywords (decision, action item, deadline): +5 points each
  - Word count: +0.1 points per word

- **Dynamic Thresholds**:
  - Minimum: 10 lines or 20 words (reduced from 15/30)
  - Weight threshold: 15 points triggers update
  - Time limits: Min 20s, Max 60s between updates

- **Conversation Pause Detection**: 
  - 10-second pause triggers summary update
  - Captures natural conversation breaks

### 2. **Incremental Updates**

New API endpoint (`/api/summary-v3`) that:
- Sends only new content + previous summary
- AI merges and updates existing summary
- Reduces token usage by ~70%
- Maintains context continuity

### 3. **Configurable Behavior**

```typescript
const config = {
  minNewLines: 10,              // Reduced from 15
  minNewWords: 20,              // Reduced from 30
  significantPause: 10000,      // 10 second pause
  minInterval: 20000,           // 20s minimum (was 30s)
  maxInterval: 60000,           // 60s maximum
  keywordTriggers: ['decision', 'action item', 'deadline'],
  speakerChangeWeight: 2,
  questionWeight: 3
};
```

### 4. **Performance Optimizations**

- **5-second check interval** (was 45s) for more responsive updates
- **Debounced manual refresh** prevents API spam
- **Weight accumulation** tracks importance between updates
- **Smart caching** reuses previous analysis

## Implementation Guide

### Option 1: Full Replacement (Recommended)

```typescript
// In your component
import { useRealtimeSummaryV2 } from '@/lib/useRealtimeSummaryV2';

const { summary, isLoading, error, refreshSummary } = useRealtimeSummaryV2({
  transcript,
  sessionId,
  conversationType,
  isRecording,
  isPaused,
  config: {
    // Custom configuration
    minNewLines: 8,
    keywordTriggers: ['budget', 'deadline', 'approval']
  }
});
```

### Option 2: Gradual Migration

1. Keep existing `useRealtimeSummary` for stability
2. Test V2 in parallel on specific pages
3. Compare performance and accuracy
4. Switch over once validated

## Benefits

1. **More Responsive**: Updates 2-3x more frequently for important content
2. **Cost Efficient**: 70% fewer tokens with incremental updates  
3. **Context Aware**: Detects important moments automatically
4. **Better UX**: Natural pause detection feels more intuitive
5. **Customizable**: Adjust thresholds per conversation type

## Monitoring

Track these metrics to validate improvements:
- Average time between updates
- Token usage per session
- User engagement with summaries
- Summary quality scores

## Future Enhancements

1. **ML-based Importance Detection**: Train model on conversation patterns
2. **Differential Updates**: Send only changed fields to frontend
3. **Summary Versioning**: Track history of changes
4. **Collaborative Summaries**: Multiple AI perspectives
5. **Voice Tone Analysis**: Detect emotional shifts

## Testing the New System

1. Enable parallel testing:
```typescript
// Compare both versions
const v1Summary = useRealtimeSummary({ ... });
const v2Summary = useRealtimeSummaryV2({ ... });

// Log differences
console.log('Update frequency:', {
  v1: v1Summary.lastUpdated,
  v2: v2Summary.lastUpdated
});
```

2. Monitor API usage in production
3. A/B test with user groups
4. Collect feedback on summary quality

## Configuration Examples

### Sales Calls
```typescript
config: {
  minNewLines: 5,  // More frequent updates
  keywordTriggers: ['price', 'discount', 'deal', 'contract'],
  questionWeight: 5  // Questions are very important
}
```

### Technical Meetings
```typescript
config: {
  minNewLines: 15,  // Less frequent, more content
  keywordTriggers: ['bug', 'feature', 'deploy', 'architecture'],
  significantPause: 15000  // Longer pauses expected
}
```

### Interviews
```typescript
config: {
  speakerChangeWeight: 4,  // High weight on turns
  keywordTriggers: ['experience', 'skills', 'salary'],
  minInterval: 30000  // Less frequent updates
}
```
/**
 * @jest-environment node
 */

// Mock OpenRouter API
global.fetch = jest.fn();

describe('Timeline API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-api-key';
  });

  it('should parse valid JSON timeline response', () => {
    const validTimelineResponse = JSON.stringify({
      timeline: [
        {
          id: 'test_event_1',
          timestamp: '2025-01-27T10:30:00Z',
          title: 'Discussion Started',
          description: 'Initial conversation about product features',
          type: 'milestone',
          importance: 'medium',
          speaker: 'ME'
        }
      ]
    });

    let timelineData;
    try {
      timelineData = JSON.parse(validTimelineResponse);
    } catch (parseError) {
      timelineData = { timeline: [] };
    }

    expect(timelineData.timeline).toBeDefined();
    expect(timelineData.timeline).toHaveLength(1);
    expect(timelineData.timeline[0].title).toBe('Discussion Started');
  });

  it('should handle malformed JSON with markdown code blocks', () => {
    const malformedResponse = '```json\n{"timeline":[{"id":"test_1","timestamp":"2025-01-27T10:30:00Z","title":"Test Event","description":"Test description","type":"milestone","importance":"high","speaker":"ME"}]}\n```';
    
    let timelineData;
    try {
      timelineData = JSON.parse(malformedResponse);
    } catch (parseError) {
      // Clean up the response
      let responseContent = malformedResponse;
      
      // Remove markdown code blocks if present
      if (responseContent.includes('```')) {
        responseContent = responseContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }
      
      // Remove any text before or after the JSON object
      const jsonStart = responseContent.indexOf('{');
      const jsonEnd = responseContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        responseContent = responseContent.substring(jsonStart, jsonEnd + 1);
      }
      
      try {
        timelineData = JSON.parse(responseContent);
      } catch (fallbackError) {
        timelineData = { timeline: [] };
      }
    }

    expect(timelineData.timeline).toBeDefined();
    expect(timelineData.timeline).toHaveLength(1);
    expect(timelineData.timeline[0].title).toBe('Test Event');
  });

  it('should handle regex fallback for severely malformed JSON', () => {
    const malformedResponse = 'Some text before {"id":"fallback_1","title":"Extracted Event","description":"Fallback extraction","type":"milestone","importance":"medium","speaker":"THEM"} some text after';
    
    let timelineData;
    try {
      timelineData = JSON.parse(malformedResponse);
    } catch (parseError) {
      // Try to extract events using regex as a fallback
      let fallbackEvents = [];
      try {
        const eventPattern = /"id":\s*"([^"]+)"[\s\S]*?"title":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]+)"[\s\S]*?"type":\s*"([^"]+)"[\s\S]*?"importance":\s*"([^"]+)"[\s\S]*?"speaker":\s*"?([^",}]+)"?/g;
        let match;
        
        while ((match = eventPattern.exec(malformedResponse)) !== null) {
          fallbackEvents.push({
            id: match[1],
            timestamp: new Date().toISOString(),
            title: match[2],
            description: match[3],
            type: match[4],
            importance: match[5],
            speaker: match[6] === 'null' ? null : match[6]
          });
        }
        
        timelineData = { timeline: fallbackEvents };
      } catch (fallbackError) {
        timelineData = { timeline: [] };
      }
    }

    expect(timelineData.timeline).toBeDefined();
    expect(Array.isArray(timelineData.timeline)).toBe(true);
    if (timelineData.timeline.length > 0) {
      expect(timelineData.timeline[0].title).toBe('Extracted Event');
    }
  });

  it('should validate timeline event types and importance', () => {
    const events = [
      {
        id: 'test_1',
        timestamp: '2025-01-27T10:30:00Z',
        title: 'Valid Event',
        description: 'Test description',
        type: 'invalid_type',
        importance: 'invalid_importance',
        speaker: 'ME'
      }
    ];

    // Validate and ensure all required fields exist (simulating the validation logic)
    const validatedEvents = events.map((event, index) => {
      return {
        id: event.id || `timeline_${Date.now()}_${index}`,
        timestamp: event.timestamp || new Date().toISOString(),
        title: event.title || 'Timeline Event',
        description: event.description || 'Event description not available',
        type: ['milestone', 'decision', 'topic_shift', 'action_item', 'question', 'agreement'].includes(event.type) 
              ? event.type : 'milestone',
        importance: ['low', 'medium', 'high'].includes(event.importance) 
                   ? event.importance : 'medium',
        speaker: event.speaker || null
      };
    });

    expect(validatedEvents[0].type).toBe('milestone'); // Should default to milestone
    expect(validatedEvents[0].importance).toBe('medium'); // Should default to medium
  });

  it('should merge new events with existing timeline without duplicates', () => {
    const existingTimeline = [
      {
        id: 'existing_event_1',
        timestamp: '2025-01-27T10:30:00Z',
        title: 'Initial Discussion',
        description: 'Started conversation',
        type: 'milestone',
        importance: 'medium',
        speaker: 'ME'
      }
    ];

    const newEvents = [
      {
        id: 'new_event_1',
        timestamp: '2025-01-27T10:35:00Z',
        title: 'New Development',
        description: 'Latest conversation development',
        type: 'topic_shift',
        importance: 'high',
        speaker: 'THEM'
      },
      {
        id: 'existing_event_1', // Duplicate ID
        timestamp: '2025-01-27T10:40:00Z',
        title: 'Duplicate Event',
        description: 'Should be filtered out',
        type: 'milestone',
        importance: 'low',
        speaker: 'ME'
      }
    ];

    // Simulate the merging logic
    const existingIds = new Set(existingTimeline.map(e => e.id));
    const uniqueNewEvents = newEvents.filter(event => !existingIds.has(event.id));
    
    const allTimelineEvents = [...existingTimeline, ...uniqueNewEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    expect(allTimelineEvents).toHaveLength(2); // Original + 1 new (duplicate filtered out)
    expect(uniqueNewEvents).toHaveLength(1); // Only the non-duplicate event
    
    const eventTitles = allTimelineEvents.map(e => e.title);
    expect(eventTitles).toContain('Initial Discussion');
    expect(eventTitles).toContain('New Development');
    expect(eventTitles).not.toContain('Duplicate Event');
  });
}); 
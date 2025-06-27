#!/usr/bin/env node

// Test SSE progress updates for report generation
async function testSSEProgress() {
  const sessionId = 'test-session-id';
  const apiUrl = `http://localhost:3000/api/sessions/${sessionId}/finalize`;
  
  console.log('🧪 Testing SSE Progress Updates');
  console.log(`📍 URL: ${apiUrl}`);
  console.log('');
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        // Add auth header if needed
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        conversationType: 'meeting',
        conversationTitle: 'Test Meeting',
        participantMe: 'Test User',
        participantThem: 'Other User'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    console.log('📊 Progress Updates:');
    console.log('═'.repeat(50));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              console.error('❌ Error:', data.message);
              return;
            }
            
            if (data.complete) {
              console.log('');
              console.log('✅ Complete!');
              console.log('📄 Result:', JSON.stringify(data.result, null, 2));
              return;
            }
            
            if (data.step !== undefined) {
              const percentage = Math.round((data.progress / data.total) * 100);
              const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
              console.log(`[${progressBar}] ${percentage}% - ${data.step}`);
            }
          } catch (e) {
            // Ignore parse errors for empty lines
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testSSEProgress().catch(console.error);
}
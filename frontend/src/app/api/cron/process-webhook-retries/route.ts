import { NextRequest, NextResponse } from 'next/server';
import { WebhookRetryService } from '@/lib/webhooks/retry-service';

export async function GET(request: NextRequest) {
  try {
    // Verify this is called by a cron job
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}` && 
        request.headers.get('x-vercel-cron') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Processing webhook retry queue...');
    
    const startTime = Date.now();
    
    // Process pending webhooks
    await WebhookRetryService.processPendingWebhooks();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Webhook retry processing completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      duration,
      message: 'Webhook retry queue processed'
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook retries:', error);
    return NextResponse.json({ 
      error: 'Failed to process webhook retries',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
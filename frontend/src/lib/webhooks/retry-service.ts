import { createServerSupabaseClient } from '@/lib/supabase';

export interface WebhookRetryOptions {
  maxRetries?: number;
  baseDelay?: number; // Base delay in ms
  maxDelay?: number;  // Max delay in ms
}

export class WebhookRetryService {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BASE_DELAY = 1000; // 1 second
  private static readonly DEFAULT_MAX_DELAY = 60000; // 1 minute

  /**
   * Queue a webhook for retry
   */
  static async queueWebhook(
    url: string,
    payload: any,
    webhookType: string,
    eventType: string,
    options: WebhookRetryOptions = {}
  ) {
    const supabase = createServerSupabaseClient();
    
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const baseDelay = options.baseDelay ?? this.DEFAULT_BASE_DELAY;
    
    // Calculate next retry time (immediate for first attempt)
    const nextRetryAt = new Date();
    
    const { error } = await supabase
      .from('webhook_retry_queue')
      .insert({
        webhook_type: webhookType,
        event_type: eventType,
        url,
        payload,
        max_retries: maxRetries,
        next_retry_at: nextRetryAt.toISOString(),
        status: 'pending'
      });
      
    if (error) {
      console.error('Failed to queue webhook:', error);
      throw error;
    }
  }

  /**
   * Process pending webhooks from the retry queue
   */
  static async processPendingWebhooks() {
    const supabase = createServerSupabaseClient();
    
    // Get pending webhooks that are due for retry
    const { data: pendingWebhooks, error } = await supabase
      .from('webhook_retry_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(10); // Process 10 at a time
      
    if (error || !pendingWebhooks) {
      console.error('Failed to fetch pending webhooks:', error);
      return;
    }
    
    // Process each webhook
    for (const webhook of pendingWebhooks) {
      await this.processWebhook(webhook);
    }
  }

  /**
   * Process a single webhook
   */
  private static async processWebhook(webhook: any) {
    const supabase = createServerSupabaseClient();
    
    // Mark as processing
    await supabase
      .from('webhook_retry_queue')
      .update({ status: 'processing' })
      .eq('id', webhook.id);
      
    try {
      // Attempt to send the webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Retry-Count': webhook.retry_count.toString(),
          'X-Webhook-Type': webhook.webhook_type,
          'X-Event-Type': webhook.event_type,
        },
        body: JSON.stringify(webhook.payload),
      });
      
      if (response.ok) {
        // Success - mark as completed
        await supabase
          .from('webhook_retry_queue')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', webhook.id);
          
        console.log(`✅ Webhook delivered successfully: ${webhook.id}`);
      } else {
        // Failed - handle retry or move to DLQ
        await this.handleWebhookFailure(
          webhook,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      // Network or other error - handle retry or move to DLQ
      await this.handleWebhookFailure(
        webhook,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle webhook failure
   */
  private static async handleWebhookFailure(webhook: any, errorMessage: string) {
    const supabase = createServerSupabaseClient();
    
    const newRetryCount = webhook.retry_count + 1;
    
    if (newRetryCount >= webhook.max_retries) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(webhook, errorMessage);
    } else {
      // Calculate next retry time with exponential backoff
      const delay = Math.min(
        this.DEFAULT_BASE_DELAY * Math.pow(2, newRetryCount),
        this.DEFAULT_MAX_DELAY
      );
      
      const nextRetryAt = new Date(Date.now() + delay);
      
      // Update webhook for retry
      await supabase
        .from('webhook_retry_queue')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          last_error: errorMessage,
          next_retry_at: nextRetryAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', webhook.id);
        
      console.log(`⏰ Webhook scheduled for retry #${newRetryCount} at ${nextRetryAt.toISOString()}`);
    }
  }

  /**
   * Move failed webhook to dead letter queue
   */
  private static async moveToDeadLetterQueue(webhook: any, lastError: string) {
    const supabase = createServerSupabaseClient();
    
    // Create DLQ entry
    const { error: dlqError } = await supabase
      .from('webhook_dead_letter_queue')
      .insert({
        original_webhook_id: webhook.id,
        webhook_type: webhook.webhook_type,
        event_type: webhook.event_type,
        url: webhook.url,
        payload: webhook.payload,
        retry_count: webhook.retry_count,
        errors: [{
          timestamp: new Date().toISOString(),
          message: lastError
        }]
      });
      
    if (dlqError) {
      console.error('Failed to move webhook to DLQ:', dlqError);
      return;
    }
    
    // Mark original webhook as failed
    await supabase
      .from('webhook_retry_queue')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', webhook.id);
      
    console.log(`💀 Webhook moved to dead letter queue: ${webhook.id}`);
  }

  /**
   * Retry a webhook from the dead letter queue
   */
  static async retryFromDLQ(dlqId: string) {
    const supabase = createServerSupabaseClient();
    
    // Get DLQ entry
    const { data: dlqEntry, error } = await supabase
      .from('webhook_dead_letter_queue')
      .select('*')
      .eq('id', dlqId)
      .single();
      
    if (error || !dlqEntry) {
      console.error('Failed to fetch DLQ entry:', error);
      return;
    }
    
    // Queue for retry
    await this.queueWebhook(
      dlqEntry.url,
      dlqEntry.payload,
      dlqEntry.webhook_type,
      dlqEntry.event_type,
      { maxRetries: 3 }
    );
    
    console.log(`🔄 Webhook requeued from DLQ: ${dlqId}`);
  }
}
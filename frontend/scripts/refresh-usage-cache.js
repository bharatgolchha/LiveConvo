require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Refresh Monthly Usage Cache
 * This script recalculates and updates the monthly_usage_cache table
 * to ensure all usage (including bot usage) is properly included
 */
async function refreshUsageCache() {
  console.log('🔄 Starting usage cache refresh...');

  try {
    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    console.log(`📅 Processing month: ${currentMonth}`);

    // Get all usage tracking entries for current month
    const { data: usageEntries, error: usageError } = await supabase
      .from('usage_tracking')
      .select('organization_id, user_id, minute_timestamp, seconds_recorded, source')
      .gte('minute_timestamp', `${currentMonth}-01T00:00:00.000Z`)
      .lt('minute_timestamp', `${getNextMonth(currentMonth)}-01T00:00:00.000Z`);

    if (usageError) {
      console.error('❌ Error fetching usage entries:', usageError);
      return;
    }

    console.log(`📊 Found ${usageEntries.length} usage tracking entries`);

    // Group by user and organization
    const userUsage = {};
    for (const entry of usageEntries) {
      const key = `${entry.organization_id}:${entry.user_id}`;
      if (!userUsage[key]) {
        userUsage[key] = {
          organization_id: entry.organization_id,
          user_id: entry.user_id,
          total_minutes: 0,
          total_seconds: 0,
          bot_minutes: 0,
          regular_minutes: 0
        };
      }
      
      userUsage[key].total_minutes += 1; // Each entry represents 1 minute
      userUsage[key].total_seconds += entry.seconds_recorded;
      
      if (entry.source === 'recall_ai_bot') {
        userUsage[key].bot_minutes += 1;
      } else {
        userUsage[key].regular_minutes += 1;
      }
    }

    console.log(`👥 Processing ${Object.keys(userUsage).length} users`);

    // Update monthly_usage_cache for each user
    for (const [key, usage] of Object.entries(userUsage)) {
      console.log(`📝 Updating cache for user ${usage.user_id}:`);
      console.log(`   Total minutes: ${usage.total_minutes} (${usage.regular_minutes} regular + ${usage.bot_minutes} bot)`);
      console.log(`   Total seconds: ${usage.total_seconds}`);

      // First try to update existing record
      const { error: updateError } = await supabase
        .from('monthly_usage_cache')
        .update({
          total_minutes_used: usage.total_minutes,
          total_seconds_used: usage.total_seconds,
          last_updated: new Date().toISOString()
        })
        .eq('organization_id', usage.organization_id)
        .eq('user_id', usage.user_id)
        .eq('month_year', currentMonth);

      // If update failed, try insert
      let cacheError = updateError;
      if (updateError && updateError.code === 'PGRST116') { // No rows updated
        const { error: insertError } = await supabase
          .from('monthly_usage_cache')
          .insert({
            organization_id: usage.organization_id,
            user_id: usage.user_id,
            month_year: currentMonth,
            total_minutes_used: usage.total_minutes,
            total_seconds_used: usage.total_seconds,
            last_updated: new Date().toISOString()
          });
        cacheError = insertError;
      }

      if (cacheError) {
        console.error(`❌ Error updating cache for user ${usage.user_id}:`, cacheError);
      } else {
        console.log(`✅ Updated cache for user ${usage.user_id}`);
      }
    }

    // Also check for any users with bot usage but no cache entry
    const { data: botSessions, error: botError } = await supabase
      .from('bot_usage_tracking')
      .select('user_id, organization_id, billable_minutes')
      .gte('created_at', `${currentMonth}-01T00:00:00.000Z`)
      .lt('created_at', `${getNextMonth(currentMonth)}-01T00:00:00.000Z`);

    if (botError) {
      console.error('❌ Error fetching bot sessions:', botError);
    } else {
      console.log(`🤖 Found ${botSessions.length} bot sessions this month`);
      
      const botUserUsage = {};
      for (const session of botSessions) {
        const key = `${session.organization_id}:${session.user_id}`;
        if (!botUserUsage[key]) {
          botUserUsage[key] = {
            organization_id: session.organization_id,
            user_id: session.user_id,
            total_bot_minutes: 0
          };
        }
        botUserUsage[key].total_bot_minutes += session.billable_minutes;
      }

      console.log(`🤖 Bot usage summary:`);
      for (const [key, usage] of Object.entries(botUserUsage)) {
        console.log(`   User ${usage.user_id}: ${usage.total_bot_minutes} bot minutes`);
      }
    }

    console.log('✅ Usage cache refresh completed!');
    
  } catch (error) {
    console.error('❌ Error refreshing usage cache:', error);
  }
}

/**
 * Get next month in YYYY-MM format
 */
function getNextMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// Run the script
refreshUsageCache()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 
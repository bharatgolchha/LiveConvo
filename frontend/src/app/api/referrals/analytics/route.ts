import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30days';
    
    let startDate = new Date();
    switch (range) {
      case '7days':
        startDate = subDays(new Date(), 7);
        break;
      case '30days':
        startDate = subDays(new Date(), 30);
        break;
      case '90days':
        startDate = subDays(new Date(), 90);
        break;
      case 'all':
        startDate = new Date('2024-01-01'); // Or your launch date
        break;
    }

    // Get overview statistics
    const { data: referrals } = await supabase
      .from('user_referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .gte('created_at', startDate.toISOString());

    const totalReferrals = referrals?.length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed' || r.status === 'rewarded').length || 0;
    const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

    // Calculate average time to convert
    const convertedReferrals = referrals?.filter(r => r.completed_at) || [];
    const avgTimeToConvert = convertedReferrals.length > 0
      ? convertedReferrals.reduce((sum, r) => {
          const days = Math.ceil((new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / convertedReferrals.length
      : 0;

    // Get total earned
    const { data: credits } = await supabase
      .from('user_credits')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'referral_reward');

    const totalEarned = credits?.reduce((sum, c) => sum + c.amount, 0) || 0;

    // Get monthly trend
    const lastMonth = subDays(new Date(), 30);
    const lastMonthReferrals = referrals?.filter(r => 
      new Date(r.created_at) < lastMonth
    ).length || 0;
    const thisMonthReferrals = referrals?.filter(r => 
      new Date(r.created_at) >= lastMonth
    ).length || 0;
    const monthlyTrend = lastMonthReferrals > 0 
      ? ((thisMonthReferrals - lastMonthReferrals) / lastMonthReferrals) * 100
      : 0;

    // Get daily stats
    const dailyStats = [];
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayReferrals = referrals?.filter(r => {
        const created = new Date(r.created_at);
        return created >= dayStart && created <= dayEnd;
      }) || [];

      const dayConversions = referrals?.filter(r => {
        if (!r.completed_at) return false;
        const completed = new Date(r.completed_at);
        return completed >= dayStart && completed <= dayEnd;
      }) || [];

      dailyStats.push({
        date: format(dayStart, 'yyyy-MM-dd'),
        new_signups: dayReferrals.length,
        conversions: dayConversions.length,
        earnings: dayConversions.length * 5, // $5 per conversion
      });
    }

    // Get referral sources (mock data for now - you'd track this in real implementation)
    const referralSources = [
      { source: 'Direct Link', count: Math.floor(totalReferrals * 0.4), conversion_rate: 25 },
      { source: 'Email', count: Math.floor(totalReferrals * 0.3), conversion_rate: 30 },
      { source: 'Social Media', count: Math.floor(totalReferrals * 0.2), conversion_rate: 20 },
      { source: 'Other', count: Math.floor(totalReferrals * 0.1), conversion_rate: 15 },
    ];

    // Get top performing months
    const monthlyData: Record<string, { referrals: number; earnings: number }> = {};
    referrals?.forEach(r => {
      const month = format(new Date(r.created_at), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { referrals: 0, earnings: 0 };
      }
      monthlyData[month].referrals += 1;
      if (r.status === 'completed' || r.status === 'rewarded') {
        monthlyData[month].earnings += r.reward_amount || 5;
      }
    });

    const topPerformers = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    return NextResponse.json({
      overview: {
        total_referrals: totalReferrals,
        total_earned: totalEarned,
        conversion_rate: conversionRate,
        average_time_to_convert: Math.round(avgTimeToConvert),
        active_referrals: referrals?.filter(r => r.status === 'pending').length || 0,
        monthly_trend: monthlyTrend,
      },
      daily_stats: dailyStats,
      referral_sources: referralSources,
      top_performers: topPerformers,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
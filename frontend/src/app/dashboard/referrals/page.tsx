'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Gift, 
  Copy, 
  Share2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  QrCode,
  ArrowLeft,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import QRCode from 'qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ReferralAnalytics } from '@/components/referrals/ReferralAnalytics';
import { ReferralAuditLogs } from '@/components/referrals/ReferralAuditLogs';

interface ReferralStats {
  referral_code: string;
  referral_url: string;
  stats: {
    total_referrals: number;
    pending: number;
    completed: number;
    total_earned: number;
    credit_balance: number;
  };
}

interface Referral {
  id: string;
  referee_email: string;
  status: 'pending' | 'completed' | 'rewarded' | 'expired';
  created_at: string;
  completed_at: string | null;
  reward_amount: number;
}

interface Credit {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  expires_at: string | null;
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [credits, setCredits] = useState<{ balance: number; transactions: Credit[] }>({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session?.access_token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchData = async () => {
    if (!session?.access_token) return;
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
    };
    
    try {
      const [statsRes, historyRes, creditsRes] = await Promise.all([
        fetch('/api/referrals/me', { headers }),
        fetch('/api/referrals/history', { headers }),
        fetch('/api/credits', { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        
        // Generate QR code
        if (statsData.referral_url) {
          const qrUrl = await QRCode.toDataURL(statsData.referral_url, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setReferrals(historyData.referrals || []);
      }

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        setCredits(creditsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!stats) return;

    const shareData = {
      title: 'Try LivePrompt.ai',
      text: `Get AI-powered real-time conversation coaching with LivePrompt.ai! Use my referral code ${stats.referral_code} for 10% off your subscription.`,
      url: stats.referral_url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await copyToClipboard(stats.referral_url, 'Referral link');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'rewarded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'rewarded':
        return <Badge variant="default" className="bg-blue-500">Rewarded</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">Referral Program</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Gift className="w-8 h-8 mr-3 text-primary" />
              Referral Program
            </h1>
            <p className="text-muted-foreground mt-2">
              Earn $5 for each friend who subscribes. Your friends get 10% off their subscription!
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="hidden md:flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stats.total_referrals || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.stats.pending || 0} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stats.completed || 0}</div>
              <p className="text-xs text-muted-foreground">Completed referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.stats.total_earned || 0}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${credits.balance || 0}</div>
              <p className="text-xs text-muted-foreground">Available to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Percent className="w-4 h-4 mr-2" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.stats && stats.stats.total_referrals > 0 
                  ? Math.round((stats.stats.completed / stats.stats.total_referrals) * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Section */}
        <Card>
          <CardHeader>
            <CardTitle>Share Your Referral Link</CardTitle>
            <CardDescription>
              Share your unique referral link or code with friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Referral Info */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Referral Code</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted px-4 py-3 rounded-lg font-mono text-lg">
                      {stats?.referral_code}
                    </code>
                    <Button
                      variant="outline"
                      onClick={() => stats && copyToClipboard(stats.referral_code, 'Referral code')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Your Referral Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={stats?.referral_url || ''}
                      className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => stats && copyToClipboard(stats.referral_url, 'Referral link')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleShare}
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`mailto:?subject=Try LivePrompt.ai&body=Get AI-powered real-time conversation coaching with LivePrompt.ai! Use my referral code ${stats?.referral_code} for 10% off your subscription: ${stats?.referral_url}`, '_blank')}
                  >
                    Email Invite
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
                {qrCodeUrl ? (
                  <>
                    <img src={qrCodeUrl} alt="Referral QR Code" className="w-48 h-48" />
                    <p className="text-sm text-muted-foreground mt-3">Scan to share</p>
                  </>
                ) : (
                  <div className="w-48 h-48 bg-muted rounded flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Referral Status Breakdown</CardTitle>
            <CardDescription>
              Visual overview of your referral pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status bars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{stats?.stats.pending || 0}</span>
                    <span className="text-xs text-muted-foreground">
                      ({stats?.stats && stats.stats.total_referrals > 0 
                        ? Math.round((stats.stats.pending / stats.stats.total_referrals) * 100) 
                        : 0}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${stats?.stats && stats.stats.total_referrals > 0 
                        ? (stats.stats.pending / stats.stats.total_referrals) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Converted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{stats?.stats.completed || 0}</span>
                    <span className="text-xs text-muted-foreground">
                      ({stats?.stats && stats.stats.total_referrals > 0 
                        ? Math.round((stats.stats.completed / stats.stats.total_referrals) * 100) 
                        : 0}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${stats?.stats && stats.stats.total_referrals > 0 
                        ? (stats.stats.completed / stats.stats.total_referrals) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {stats?.stats.pending || 0} referrals are waiting for their first payment. 
                  Once they subscribe, you'll earn $5 per referral!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="referrals">Referral History</TabsTrigger>
            <TabsTrigger value="credits">Credit History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>
                  Track the status of your referrals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No referrals yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Share your link to start earning rewards!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(referral.status)}
                          <div>
                            <p className="font-medium">{referral.referee_email}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {format(new Date(referral.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(referral.status)}
                          {referral.status === 'completed' && (
                            <span className="text-sm font-medium text-green-600">
                              +${referral.reward_amount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Credit Transactions</CardTitle>
                <CardDescription>
                  Your credit earning and spending history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {credits.transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No credit transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {credits.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          {transaction.expires_at && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Expires {format(new Date(transaction.expires_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <span className={`font-bold ${
                          transaction.type === 'redemption' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'redemption' ? '-' : '+'}${Math.abs(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <ReferralAnalytics />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ReferralAuditLogs />
          </TabsContent>
        </Tabs>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">1. Share Your Link</h4>
                <p className="text-sm text-muted-foreground">
                  Share your unique referral link or code with friends
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">2. They Sign Up & Save</h4>
                <p className="text-sm text-muted-foreground">
                  Your friends get 10% off their subscription
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">3. You Earn $5</h4>
                <p className="text-sm text-muted-foreground">
                  Get $5 credit when they complete their first payment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
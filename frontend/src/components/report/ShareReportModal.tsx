import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  Copy, 
  Check,
  FileText,
  Lightbulb,
  Target,
  BarChart3,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
}

interface ShareSettings {
  tabs: {
    overview: boolean;
    insights: boolean;
    actions: boolean;
    analytics: boolean;
    followup: boolean;
  };
  expiration: string;
  message: string;
}

const TAB_INFO = [
  { id: 'overview', label: 'Overview', icon: FileText, description: 'Executive summary and key highlights' },
  { id: 'insights', label: 'Insights & Decisions', icon: Lightbulb, description: 'Strategic insights and key decisions' },
  { id: 'actions', label: 'Action Items', icon: Target, description: 'Tasks and action items with assignments' },
  { id: 'analytics', label: 'Analytics & Performance', icon: BarChart3, description: 'Meeting metrics and effectiveness scores' },
  { id: 'followup', label: 'Follow-up & Next Steps', icon: Calendar, description: 'Next meeting prep and follow-up content' },
];

export function ShareReportModal({ isOpen, onClose, reportId, reportTitle }: ShareReportModalProps) {
  const { session } = useAuth();
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    tabs: {
      overview: true,
      insights: true,
      actions: true,
      analytics: false,
      followup: false,
    },
    expiration: '7days',
    message: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTabToggle = (tabId: string) => {
    setShareSettings(prev => ({
      ...prev,
      tabs: {
        ...prev.tabs,
        [tabId]: !prev.tabs[tabId as keyof typeof prev.tabs],
      },
    }));
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const selectedTabs = Object.entries(shareSettings.tabs)
        .filter(([_, enabled]) => enabled)
        .map(([tabId]) => tabId);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: reportId,
          sharedTabs: selectedTabs,
          expiresIn: shareSettings.expiration,
          message: shareSettings.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const { shareUrl } = await response.json();
      setShareLink(shareUrl);
    } catch (error) {
      console.error('Error generating share link:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCount = Object.values(shareSettings.tabs).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Report
          </DialogTitle>
          <DialogDescription>
            Share "{reportTitle}" with others. Choose what information to include.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {!shareLink ? (
            <>
              {/* Tab Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Select sections to share</Label>
                  <span className="text-sm text-muted-foreground">
                    {selectedCount} selected
                  </span>
                </div>
                <div className="space-y-2">
                  {TAB_INFO.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <div
                        key={tab.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                      >
                        <Checkbox
                          id={tab.id}
                          checked={shareSettings.tabs[tab.id as keyof typeof shareSettings.tabs]}
                          onCheckedChange={() => handleTabToggle(tab.id)}
                        />
                        <Label
                          htmlFor={tab.id}
                          className="flex-1 cursor-pointer space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{tab.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {tab.description}
                          </p>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expiration">Link expiration</Label>
                <Select
                  value={shareSettings.expiration}
                  onValueChange={(value) => setShareSettings(prev => ({ ...prev, expiration: value }))}
                >
                  <SelectTrigger id="expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24hours">24 hours</SelectItem>
                    <SelectItem value="7days">7 days</SelectItem>
                    <SelectItem value="30days">30 days</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Add a message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add context or instructions for recipients..."
                  value={shareSettings.message}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateLink}
                  disabled={selectedCount === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Generate Link
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Share Link Generated */}
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">Share link created!</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Anyone with this link can view the selected sections of your report.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Share link</Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-muted border border-input rounded-md"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Shared sections:</p>
                      <ul className="mt-1 space-y-0.5">
                        {TAB_INFO.filter(tab => shareSettings.tabs[tab.id as keyof typeof shareSettings.tabs])
                          .map(tab => (
                            <li key={tab.id}>• {tab.label}</li>
                          ))}
                      </ul>
                      {shareSettings.expiration !== 'never' && (
                        <p className="mt-2">
                          Expires in: {shareSettings.expiration === '24hours' ? '24 hours' : shareSettings.expiration === '7days' ? '7 days' : '30 days'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShareLink('');
                      setCopied(false);
                    }}
                  >
                    Create Another Link
                  </Button>
                  <Button onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
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
import { EmailTagInput } from '@/components/ui/EmailTagInput';
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
  AlertCircle,
  Mail,
  Send,
  MessageSquare
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
    transcript: boolean;
  };
  expiration: string;
  message: string;
  sendEmail: boolean;
  emailRecipients: string[];
}

const TAB_INFO = [
  { id: 'overview', label: 'Overview', icon: FileText, description: 'Executive summary and key highlights' },
  { id: 'insights', label: 'Insights & Decisions', icon: Lightbulb, description: 'Strategic insights and key decisions' },
  { id: 'actions', label: 'Action Items', icon: Target, description: 'Tasks and action items with assignments' },
  { id: 'analytics', label: 'Analytics & Performance', icon: BarChart3, description: 'Meeting metrics and effectiveness scores' },
  { id: 'followup', label: 'Follow-up & Next Steps', icon: Calendar, description: 'Next meeting prep and follow-up content' },
  { id: 'transcript', label: 'Transcript', icon: MessageSquare, description: 'Full conversation transcript and recording' },
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
      transcript: false,
    },
    expiration: '7days',
    message: '',
    sendEmail: false,
    emailRecipients: [],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailsSent, setEmailsSent] = useState(false);

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
          emailRecipients: shareSettings.sendEmail ? shareSettings.emailRecipients : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const { shareUrl, emailsSent: emailsSentResponse } = await response.json();
      setShareLink(shareUrl);
      if (emailsSentResponse) {
        setEmailsSent(true);
      }
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
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="w-4 h-4" />
            Share Report
          </DialogTitle>
          <DialogDescription className="text-xs">
            Share "{reportTitle}" with others. Choose what information to include.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!shareLink ? (
            <>
              {/* Tab Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select sections to share</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TAB_INFO.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <div
                        key={tab.id}
                        className="flex items-center space-x-2 p-2 rounded-md border bg-card/50 hover:bg-card/80 transition-colors"
                      >
                        <Checkbox
                          id={tab.id}
                          checked={shareSettings.tabs[tab.id as keyof typeof shareSettings.tabs]}
                          onCheckedChange={() => handleTabToggle(tab.id)}
                          className="h-4 w-4"
                        />
                        <Label
                          htmlFor={tab.id}
                          className="flex-1 cursor-pointer flex items-center gap-1.5 text-sm"
                        >
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{tab.label}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expiration and Message Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expiration" className="text-sm">Link expiration</Label>
                  <Select
                    value={shareSettings.expiration}
                    onValueChange={(value) => setShareSettings(prev => ({ ...prev, expiration: value }))}
                  >
                    <SelectTrigger id="expiration" className="h-9">
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

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-sm">Message (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add context..."
                    value={shareSettings.message}
                    onChange={(e) => setShareSettings(prev => ({ ...prev, message: e.target.value }))}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Email Recipients */}
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendEmail"
                    checked={shareSettings.sendEmail}
                    onCheckedChange={(checked) => 
                      setShareSettings(prev => ({ ...prev, sendEmail: checked as boolean }))
                    }
                    className="h-4 w-4"
                  />
                  <Label 
                    htmlFor="sendEmail" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Send report via email
                  </Label>
                </div>
                
                {shareSettings.sendEmail && (
                  <div className="space-y-1.5 mt-3">
                    <EmailTagInput
                      value={shareSettings.emailRecipients}
                      onChange={(emails) => 
                        setShareSettings(prev => ({ ...prev, emailRecipients: emails }))
                      }
                      placeholder="Enter email addresses (press Enter or comma to add)"
                      className="w-full"
                      maxEmails={10}
                    />
                    <p className="text-xs text-muted-foreground pl-1">
                      Recipients will receive the summary and share link
                    </p>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose} size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateLink}
                  disabled={
                    selectedCount === 0 || 
                    isGenerating || 
                    (shareSettings.sendEmail && shareSettings.emailRecipients.length === 0)
                  }
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      {shareSettings.sendEmail && shareSettings.emailRecipients.length > 0 ? (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Generate Link & Send
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Generate Link
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Share Link Generated */}
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-primary" />
                    <h3 className="font-medium text-sm">Share link created!</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view the selected sections of your report.
                  </p>
                  {emailsSent && shareSettings.emailRecipients.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-primary/20">
                      <div className="flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs text-muted-foreground">
                          Email sent to {shareSettings.emailRecipients.length} recipient{shareSettings.emailRecipients.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Share link</Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-2.5 py-1.5 text-xs bg-muted border border-input rounded-md"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-2.5 bg-muted/50 rounded-md">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium">Shared sections:</p>
                      <span className="text-xs">
                        {TAB_INFO.filter(tab => shareSettings.tabs[tab.id as keyof typeof shareSettings.tabs])
                          .map(tab => tab.label).join(', ')}
                      </span>
                      {shareSettings.expiration !== 'never' && (
                        <p className="mt-1">
                          Expires: {shareSettings.expiration === '24hours' ? '24 hours' : shareSettings.expiration === '7days' ? '7 days' : '30 days'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShareLink('');
                      setCopied(false);
                      setEmailsSent(false);
                    }}
                    size="sm"
                  >
                    Create Another Link
                  </Button>
                  <Button onClick={onClose} size="sm">
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
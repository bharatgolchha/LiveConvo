import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { CustomReportEditor } from './CustomReportEditor';
import { 
  Sparkles, 
  Save, 
  X, 
  Send,
  Loader2,
  Copy,
  Check,
  Share2,
  FileText,
  Clock,
  Trash2,
  Link2,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Switch } from '@/components/ui/switch';

interface CustomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sharedToken?: string;
  onReportGenerated?: () => void;
}

interface CustomReport {
  id: string;
  session_id: string;
  prompt: string;
  template: string;
  generated_content: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export function CustomReportModal({ 
  isOpen, 
  onClose, 
  sessionId, 
  sharedToken,
  onReportGenerated 
}: CustomReportModalProps) {
  const { session } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<CustomReport | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [includeLinkedConversations, setIncludeLinkedConversations] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [linkedConversations, setLinkedConversations] = useState<any[]>([]);
  const [loadingLinkedConversations, setLoadingLinkedConversations] = useState(false);

  const templates = [
    { value: 'executive', label: 'Executive Summary', icon: FileText },
    { value: 'technical', label: 'Technical Report', icon: FileText },
    { value: 'action_items', label: 'Action Items Report', icon: FileText },
    { value: 'stakeholder', label: 'Stakeholder Update', icon: FileText },
  ];

  const templatePrompts: Record<string, string> = {
    executive: 'Generate an executive summary focusing on key decisions, outcomes, and strategic implications.',
    technical: 'Create a detailed technical report including discussed technologies, implementation details, and technical decisions.',
    action_items: 'Generate a comprehensive list of action items with owners, deadlines, and priority levels.',
    stakeholder: 'Create a stakeholder update highlighting progress, blockers, and next steps.',
  };

  useEffect(() => {
    if (selectedTemplate && templatePrompts[selectedTemplate]) {
      setPrompt(templatePrompts[selectedTemplate]);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (isOpen && sessionId && !sharedToken) {
      fetchLinkedConversations();
    }
  }, [isOpen, sessionId, sharedToken]);

  const fetchLinkedConversations = async () => {
    if (!session?.access_token) return;
    
    setLoadingLinkedConversations(true);
    try {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${session.access_token}`,
      };
      
      const response = await fetch(`/api/sessions/${sessionId}/linked`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedConversations(data.linkedSessions || []);
      }
    } catch (error) {
      console.error('Error fetching linked conversations:', error);
    } finally {
      setLoadingLinkedConversations(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedReport('');
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token && !sharedToken) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const url = sharedToken 
        ? `/api/reports/${sessionId}/custom?token=${sharedToken}`
        : `/api/reports/${sessionId}/custom`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          action: 'generate',
          includeLinkedConversations,
          enableWebSearch
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let reportContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  reportContent += data.content;
                  setGeneratedReport(reportContent);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!generatedReport || !session?.access_token || sharedToken) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const reportTitle = prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '');
      
      const response = await fetch(`/api/reports/${sessionId}/custom/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          template: selectedTemplate,
          content: generatedReport,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save report');
      }

      const result = await response.json();
      console.log('Save response:', result);
      setCurrentReport(result.report || result);
      setHasUnsavedChanges(false);
      
      if (onReportGenerated) {
        onReportGenerated();
      }
    } catch (error) {
      console.error('Error saving report:', error);
      setError('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReport = async () => {
    // The generatedReport is already in markdown format
    await navigator.clipboard.writeText(generatedReport);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDiscardReport = () => {
    setGeneratedReport('');
    setPrompt('');
    setCurrentReport(null);
    setHasUnsavedChanges(false);
    setSelectedTemplate('');
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        handleDiscardReport();
        setLinkedConversations([]);
        setIncludeLinkedConversations(false);
        setEnableWebSearch(false);
        onClose();
      }
    } else {
      setLinkedConversations([]);
      setIncludeLinkedConversations(false);
      setEnableWebSearch(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Custom Report Generator
          </DialogTitle>
          <DialogDescription>
            Generate AI-powered reports based on your meeting transcript and summaries
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!generatedReport ? (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.value}
                        onClick={() => setSelectedTemplate(template.value)}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedTemplate === template.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1" />
                        <p className="text-xs font-medium">{template.label}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    What kind of report would you like to generate?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., Generate a technical architecture document based on the discussions, or create a project status report for stakeholders..."
                    className="w-full h-32 px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                      <label htmlFor="linked-conversations" className="text-sm font-medium">
                        Include linked conversations
                      </label>
                    </div>
                    <Switch
                      id="linked-conversations"
                      checked={includeLinkedConversations}
                      onCheckedChange={setIncludeLinkedConversations}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Reference summaries from related conversations in the report
                  </p>
                  
                  {/* Show linked conversations if they exist */}
                  {linkedConversations.length > 0 && (
                    <div className="ml-6 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {linkedConversations.length} linked conversation{linkedConversations.length > 1 ? 's' : ''} found:
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {linkedConversations.map((session) => (
                          <div
                            key={session.id}
                            className="p-2 bg-muted/50 rounded-md border border-border/50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {session.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(session.date).toLocaleDateString()} • {Math.round((session.duration || 0) / 60)}m
                                </p>
                              </div>
                            </div>
                            {session.summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {session.summary}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {loadingLinkedConversations && (
                    <div className="ml-6 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading linked conversations...
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <label htmlFor="web-search" className="text-sm font-medium">
                        Enable web search
                      </label>
                    </div>
                    <Switch
                      id="web-search"
                      checked={enableWebSearch}
                      onCheckedChange={setEnableWebSearch}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Use GPT-4o with web search for current information
                  </p>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {isGenerating ? (
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Generating your report...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Enter a prompt above to generate a custom report
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden">
              <CustomReportEditor
                content={generatedReport}
                onChange={(content) => {
                  setGeneratedReport(content);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!generatedReport ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCopyReport}
                size="sm"
              >
                {isCopied ? (
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
              <Button
                variant="outline"
                onClick={handleDiscardReport}
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
              {!sharedToken && (
                <Button
                  onClick={handleSaveReport}
                  disabled={isSaving || !hasUnsavedChanges}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Report
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
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
  FileText,
  Trash2,
  Link2,
  Globe,
  ChevronDown,
  ChevronUp,
  Wand2,
  Settings,
  ArrowRight,
  Zap,
  Target,
  Users,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

// Template definitions with icons and descriptions
const templates = [
  { 
    value: 'executive', 
    label: 'Executive Summary',
    icon: Target,
    description: 'High-level overview for leadership',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950'
  },
  { 
    value: 'technical', 
    label: 'Technical Report',
    icon: BarChart3,
    description: 'Detailed technical analysis',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950'
  },
  { 
    value: 'action_items', 
    label: 'Action Items',
    icon: ClipboardList,
    description: 'Tasks and next steps',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950'
  },
  { 
    value: 'stakeholder', 
    label: 'Stakeholder Update',
    icon: Users,
    description: 'Progress and status report',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950'
  },
];

const templatePrompts: Record<string, string> = {
  executive: 'Generate an executive summary focusing on key decisions, outcomes, and strategic implications.',
  technical: 'Create a detailed technical report including discussed technologies, implementation details, and technical decisions.',
  action_items: 'Generate a comprehensive list of action items with owners, deadlines, and priority levels.',
  stakeholder: 'Create a stakeholder update highlighting progress, blockers, and next steps.',
};

export function CustomReportModalImproved({ 
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
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeLinkedConversations, setIncludeLinkedConversations] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [linkedConversations, setLinkedConversations] = useState<any[]>([]);
  const [loadingLinkedConversations, setLoadingLinkedConversations] = useState(false);
  
  // Suggestions
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Preferences
  const [audience, setAudience] = useState<string>('');
  const [tone, setTone] = useState<string>('');
  const [lengthPref, setLengthPref] = useState<string>('');

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
      setCurrentReport(result.report || result);
      setHasUnsavedChanges(false);
      
      if (onReportGenerated) {
        onReportGenerated();
      }

      // Reset and close
      setGeneratedReport('');
      setPrompt('');
      setSelectedTemplate('');
      setCurrentReport(null);
      setLinkedConversations([]);
      setIncludeLinkedConversations(false);
      setEnableWebSearch(false);
      setPromptSuggestions([]);
      setAudience('');
      setTone('');
      setLengthPref('');
      setShowAdvanced(false);
      setShowSuggestions(false);
      
      onClose();
    } catch (error) {
      console.error('Error saving report:', error);
      setError('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReport = async () => {
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
        setPromptSuggestions([]);
        setAudience('');
        setTone('');
        setLengthPref('');
        setShowAdvanced(false);
        setShowSuggestions(false);
        onClose();
      }
    } else {
      setLinkedConversations([]);
      setIncludeLinkedConversations(false);
      setEnableWebSearch(false);
      setPromptSuggestions([]);
      setAudience('');
      setTone('');
      setLengthPref('');
      setShowAdvanced(false);
      setShowSuggestions(false);
      onClose();
    }
  };

  const handleSuggestPrompts = async () => {
    if (isSuggesting) return;
    try {
      setIsSuggesting(true);
      setError(null);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token && !sharedToken) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`/api/reports/${sessionId}/custom/suggest-prompts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          selectedTemplate,
          includeLinkedConversations,
          audience,
          tone,
          length: lengthPref,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch prompt suggestions');
      }
      const data = await response.json();
      setPromptSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setShowSuggestions(true);
    } catch (e) {
      console.error('Error suggesting prompts:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch prompt suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleQuickStart = () => {
    setSelectedTemplate('executive');
    setPrompt(templatePrompts.executive);
    handleGenerateReport();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Custom Report Generator
          </DialogTitle>
          <DialogDescription className="text-sm">
            Create AI-powered reports from your meeting data
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!generatedReport ? (
            <div className="h-full flex flex-col">
              {/* Template Selection - Clean Grid */}
              <div className="px-6 py-4 border-b bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Choose a template to get started</h3>
                  <Button
                    onClick={handleQuickStart}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Zap className="w-3 h-3" />
                    Quick Start
                  </Button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.value}
                        onClick={() => setSelectedTemplate(template.value)}
                        className={`relative p-4 rounded-lg border-2 transition-all group ${
                          selectedTemplate === template.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className={`${template.bgColor} rounded-lg p-2 w-fit mb-2`}>
                          <Icon className={`w-5 h-5 ${template.color}`} />
                        </div>
                        <p className="text-sm font-medium text-left">{template.label}</p>
                        <p className="text-xs text-muted-foreground text-left mt-1">
                          {template.description}
                        </p>
                        {selectedTemplate === template.value && (
                          <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4 space-y-4">
                  {/* Prompt Input Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Describe the report you want
                      </label>
                      <Button
                        onClick={handleSuggestPrompts}
                        variant="ghost"
                        size="sm"
                        disabled={isSuggesting}
                        className="gap-2"
                      >
                        {isSuggesting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        Get AI Suggestions
                      </Button>
                    </div>
                    
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g., Generate a technical architecture document focusing on the API design decisions..."
                      className="w-full h-32 px-4 py-3 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />

                    {/* AI Suggestions - Compact Display */}
                    {showSuggestions && promptSuggestions.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            AI Suggestions
                          </p>
                          <button
                            onClick={() => setShowSuggestions(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {promptSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setPrompt(suggestion);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left p-2 bg-background border border-border rounded-md hover:bg-primary/5 hover:border-primary/50 transition-colors group"
                            >
                              <p className="text-xs line-clamp-2 group-hover:text-primary">
                                {suggestion}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Advanced Options - Collapsible */}
                  <div className="border rounded-lg">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Advanced Options</span>
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    
                    {showAdvanced && (
                      <div className="px-4 pb-4 space-y-4 border-t">
                        {/* Preferences */}
                        <div className="pt-4 space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Customize Output
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              value={audience}
                              onChange={(e) => setAudience(e.target.value)}
                              placeholder="Audience (e.g., executives)"
                              className="px-3 py-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                            <input
                              value={tone}
                              onChange={(e) => setTone(e.target.value)}
                              placeholder="Tone (e.g., formal)"
                              className="px-3 py-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                            <input
                              value={lengthPref}
                              onChange={(e) => setLengthPref(e.target.value)}
                              placeholder="Length (e.g., 2 pages)"
                              className="px-3 py-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        </div>

                        {/* Toggle Options */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <label htmlFor="linked" className="text-sm font-medium">
                                  Include linked conversations
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  Reference related meetings
                                </p>
                              </div>
                            </div>
                            <Switch
                              id="linked"
                              checked={includeLinkedConversations}
                              onCheckedChange={setIncludeLinkedConversations}
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <label htmlFor="web" className="text-sm font-medium">
                                  Enable web search
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  Include current information
                                </p>
                              </div>
                            </div>
                            <Switch
                              id="web"
                              checked={enableWebSearch}
                              onCheckedChange={setEnableWebSearch}
                            />
                          </div>
                        </div>

                        {/* Linked Conversations List */}
                        {includeLinkedConversations && linkedConversations.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              {linkedConversations.length} linked conversation{linkedConversations.length > 1 ? 's' : ''} will be included
                            </p>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {linkedConversations.map((session) => (
                                <div
                                  key={session.id}
                                  className="p-2 bg-background rounded border border-border/50 text-xs"
                                >
                                  <p className="font-medium truncate">{session.title}</p>
                                  <p className="text-muted-foreground">
                                    {new Date(session.date).toLocaleDateString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Area */}
                  {isGenerating && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center space-y-3">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Generating your custom report...
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t bg-muted/10">
                <div className="flex items-center justify-between">
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
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden px-6 py-4">
                <CustomReportEditor
                  content={generatedReport}
                  onChange={(content) => {
                    setGeneratedReport(content);
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
              
              <DialogFooter className="px-6 py-4 border-t bg-muted/10">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
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
                  </div>
                  
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
                </div>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
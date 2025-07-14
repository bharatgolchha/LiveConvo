import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Loader2,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
  Eye,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CustomReportModal } from "./CustomReportModal";
import { DeleteConfirmationModal } from "@/components/ui/DeleteConfirmationModal";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { UpgradeCTA } from "@/components/subscription/UpgradeCTA";
import { CustomReportExportMenu } from "./CustomReportExportMenu";

interface CustomReportTabProps {
  sessionId: string;
  sharedToken?: string;
  customReports?: CustomReport[];
  sessionTitle?: string;
}

interface CustomReport {
  id: string;
  prompt: string;
  template: string;
  generated_content: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export function CustomReportTab({
  sessionId,
  sharedToken,
  customReports,
  sessionTitle,
}: CustomReportTabProps) {
  const { session } = useAuth();
  const { subscription, hasFeature, loading: subscriptionLoading } = useSubscription();
  const [reportHistory, setReportHistory] = useState<CustomReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CustomReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<CustomReport | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('CustomReportTab Debug:', {
      subscription,
      hasCustomTemplates: hasFeature('hasCustomTemplates'),
      subscriptionLoading,
      sharedToken,
      userEmail: session?.user?.email
    });
  }, [subscription, subscriptionLoading, sharedToken, session]);

  useEffect(() => {
    if (sharedToken && customReports) {
      // For shared reports, use the provided custom reports
      setReportHistory(customReports);
      setIsLoading(false);
    } else if (sessionId && !sharedToken) {
      fetchReportHistory();
    }
  }, [sessionId, sharedToken, customReports]);

  const fetchReportHistory = async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${session.access_token}`,
      };

      const response = await fetch(`/api/reports/${sessionId}/custom`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched custom reports:', data.reports);
        setReportHistory(data.reports || []);
      } else {
        setError("Failed to fetch report history");
      }
    } catch (err) {
      console.error("Error fetching report history:", err);
      setError("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportGenerated = () => {
    fetchReportHistory();
  };

  const handleCopyReport = async (reportId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content || '');
      setCopiedId(reportId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };


  const handleDeleteReport = async () => {
    if (!reportToDelete || !session?.access_token) return;

    setDeletingReportId(reportToDelete.id);
    try {
      const response = await fetch(`/api/reports/${sessionId}/custom/${reportToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        // Remove the deleted report from the state
        setReportHistory(prev => prev.filter(r => r.id !== reportToDelete.id));
        // Close expanded view if it was the deleted report
        if (expandedReportId === reportToDelete.id) {
          setExpandedReportId(null);
        }
      } else {
        setError("Failed to delete report");
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report");
    } finally {
      setDeletingReportId(null);
      setReportToDelete(null);
    }
  };

  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Session Not Found
        </h3>
        <p className="text-sm text-muted-foreground">
          Unable to load custom reports. Please refresh the page and try again.
        </p>
      </div>
    );
  }

  // Check if user has access to custom reports
  const hasCustomReportsAccess = sharedToken || hasFeature('hasCustomTemplates');
  
  // Debug logging
  console.log('CustomReportTab Debug:', {
    sessionId,
    sharedToken: !!sharedToken,
    subscriptionLoading,
    subscription,
    hasCustomReportsAccess,
    hasFeatureResult: hasFeature('hasCustomTemplates'),
    features: subscription?.plan?.features,
    userEmail: session?.user?.email
  });

  // Show loading state while checking subscription
  if (!sharedToken && subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show upgrade CTA if user doesn't have access
  if (!sharedToken && !hasCustomReportsAccess) {
    return (
      <div className="space-y-6">
        <UpgradeCTA
          variant="modal"
          feature="Custom AI Reports"
          reason="Generate unlimited custom reports tailored to your specific needs. Extract insights, create documentation, and analyze your conversations with AI-powered templates."
          className="mt-8"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Only show when not in shared mode */}
      {!sharedToken && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Custom Reports
                </h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered reports tailored to your needs
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Generate Report
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Report History */}
      {!isLoading && reportHistory.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Generated Reports ({reportHistory.length})
          </h4>
          <div className="grid gap-4">
            {reportHistory.map((report) => (
              <div
                key={report.id}
                className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => {
                    console.log('Expanding report:', report.id, 'Content:', report.generated_content);
                    setExpandedReportId(
                      expandedReportId === report.id ? null : report.id
                    );
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-foreground line-clamp-2">
                        {report.prompt}
                      </h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.template === 'custom' ? 'Custom Report' : report.template}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight 
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedReportId === report.id ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                </div>

                {expandedReportId === report.id && (
                  <div className="border-t border-border">
                    <div className="p-4 bg-muted/10">
                      <div className="flex justify-end gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyReport(report.id, report.generated_content)}
                        >
                          {copiedId === report.id ? (
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
                        <CustomReportExportMenu
                          report={report}
                          sessionTitle={sessionTitle}
                          disabled={false}
                        />
                        {!sharedToken && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportToDelete(report);
                            }}
                            disabled={deletingReportId === report.id}
                          >
                            {deletingReportId === report.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        )}
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {report.generated_content || 'No content available'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && reportHistory.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Reports Yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Generate custom reports from your meeting data using AI.
          </p>
          {!sharedToken && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Your First Report
            </Button>
          )}
        </div>
      )}

      {/* Custom Report Modal */}
      {!sharedToken && (
        <CustomReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          sessionId={sessionId}
          sharedToken={sharedToken}
          onReportGenerated={handleReportGenerated}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={handleDeleteReport}
        title="Delete Custom Report"
        description="Are you sure you want to delete this report? This action cannot be undone."
        itemName={reportToDelete?.prompt}
        isLoading={!!deletingReportId}
        confirmButtonText="Delete Report"
        loadingText="Deleting Report..."
        itemSubtitle="Will be permanently removed"
      />
    </div>
  );
}

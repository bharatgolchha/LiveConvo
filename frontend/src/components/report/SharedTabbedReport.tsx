import React from 'react';
import {
  FileText,
  Lightbulb,
  Target,
  BarChart3,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { TabbedReport } from './TabbedReport';

interface SharedTabbedReportProps {
  report: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  allowedTabs: string[];
  sharedToken?: string;
}

const ALL_TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'insights', label: 'Insights & Decisions', icon: Lightbulb },
  { id: 'actions', label: 'Action Items', icon: Target },
  { id: 'analytics', label: 'Analytics & Performance', icon: BarChart3 },
  { id: 'followup', label: 'Follow-up & Next Steps', icon: Calendar },
  { id: 'transcript', label: 'Transcript', icon: MessageSquare }
];

export function SharedTabbedReport({ report, activeTab, setActiveTab, allowedTabs, sharedToken }: SharedTabbedReportProps) {
  // Filter tabs to only show allowed ones
  const visibleTabs = ALL_TABS.filter(tab => allowedTabs.includes(tab.id));
  
  // Ensure activeTab is valid
  React.useEffect(() => {
    if (!allowedTabs.includes(activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, allowedTabs, visibleTabs, setActiveTab]);
  
  // Create a wrapper component that filters the tab navigation
  return (
    <div className="shared-tabbed-report">
      {/* Custom Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6 px-1 overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* Use the regular TabbedReport component with hideNavigation prop */}
      <TabbedReport 
        report={report}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hideNavigation={true}
        sharedToken={sharedToken}
      />
    </div>
  );
}
import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Check,
  Calendar,
  Clock,
  FileText,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ConversationSession } from '@/types/conversation';
import { formatConversationDate } from '@/lib/utils';
import { getConversationTypeDisplay } from '@/lib/conversation/conversationTypeMap';
import { formatDuration } from '@/lib/utils/time';

interface PreviousConversationsSelectorProps {
  sessions: ConversationSession[];
  selectedSessions: string[];
  onToggleSession: (sessionId: string) => void;
  isLoading?: boolean;
  maxSelections?: number;
  className?: string;
}

export const PreviousConversationsSelector: React.FC<PreviousConversationsSelectorProps> = ({
  sessions,
  selectedSessions,
  onToggleSession,
  isLoading = false,
  maxSelections = 3,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const title = session.title?.toLowerCase() || '';
    const type = session.conversation_type?.toLowerCase() || '';
    
    return title.includes(query) || type.includes(query);
  });

  const isSelected = (sessionId: string) => selectedSessions.includes(sessionId);
  const canSelectMore = selectedSessions.length < maxSelections;

  const handleToggle = (sessionId: string) => {
    if (isSelected(sessionId) || canSelectMore) {
      onToggleSession(sessionId);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4" />
          Previous Conversations
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          Select up to {maxSelections} previous conversations to provide context for this session.
          {selectedSessions.length > 0 && (
            <span className="ml-1 font-medium">
              ({selectedSessions.length} selected)
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sessions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'No conversations match your search'
                : 'No previous conversations available'}
            </p>
          </Card>
        ) : (
          filteredSessions.map((session) => {
            const selected = isSelected(session.id);
            const expanded = expandedSession === session.id;
            const duration = session.recording_duration_seconds 
              ? formatDuration(session.recording_duration_seconds) 
              : null;
            
            return (
              <Card 
                key={session.id}
                className={cn(
                  "transition-all cursor-pointer",
                  selected && "ring-2 ring-primary"
                )}
              >
                <div 
                  className="p-4"
                  onClick={() => handleToggle(session.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={cn(
                      "w-5 h-5 rounded border-2 shrink-0 mt-0.5 transition-colors",
                      selected 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground/50",
                      !selected && !canSelectMore && "opacity-50"
                    )}>
                      {selected && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {session.title || 'Untitled Conversation'}
                      </h4>
                      
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatConversationDate(session.created_at, 'dashboard')}
                        </span>
                        
                        {duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {duration}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {getConversationTypeDisplay(
                            (session.conversation_type as any) || 'meeting'
                          )}
                        </Badge>
                        
                        {session.summaries && session.summaries.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Has Summary
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Expand Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSession(expanded ? null : session.id);
                      }}
                    >
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expanded && "rotate-90"
                        )}
                      />
                    </Button>
                  </div>
                </div>

                {/* Expanded Summary */}
                {expanded && session.summaries && session.summaries[0] && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium mb-2">Summary:</p>
                      <p className="text-muted-foreground">
                        {session.summaries[0].tldr || 'No summary available'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Selection Info */}
      {!canSelectMore && selectedSessions.length === maxSelections && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum selections reached. Deselect a conversation to choose another.
        </p>
      )}
    </div>
  );
};
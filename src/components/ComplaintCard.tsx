import { Complaint } from '@/types/complaint';
import { formatRelativeTime } from '@/lib/dateUtils';
import { Clock, AlertTriangle, MessageSquare, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ComplaintCardProps {
  complaint: Complaint;
  onView: (c: Complaint) => void;
  showCitizenName?: boolean;
}

export function ComplaintCard({ complaint, onView, showCitizenName = false }: ComplaintCardProps) {
  const isEscalated = complaint.escalationLevel > 0;
  
  // Translation display logic
  const displayTitle = complaint.language === 'english' || !complaint.translatedTitle
      ? complaint.title 
      : complaint.translatedTitle;
      
  const originalTitle = complaint.wasTranslated ? complaint.originalTitle : null;

  return (
    <div
      className={`
        group relative p-5 rounded-lg border transition-all cursor-pointer
        bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07] shadow-sm hover:shadow-md
        ${isEscalated ? 'border-l-4 border-l-destructive bg-destructive/5' : ''}
      `}
      onClick={() => onView(complaint)}
    >
      {/* Header with Title and Severity */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold leading-tight" title={displayTitle}>
              {displayTitle}
            </h3>
            {originalTitle && (
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                <MessageSquare className="w-3 h-3 mr-1" />
                Translated from {complaint.language}
              </Badge>
            )}
          </div>
          
          {showCitizenName && (
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">{complaint.citizenName}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`
            px-3 py-1 text-xs font-bold uppercase tracking-wider
            ${complaint.severity === 'critical' ? 'bg-destructive/20 text-destructive border-destructive/30' :
              complaint.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
              complaint.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
              'bg-green-500/20 text-green-400 border-green-500/30'}
          `}>
            {complaint.severity}
          </Badge>
          
          {isEscalated && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              L{complaint.escalationLevel} Escalated
            </Badge>
          )}
        </div>
      </div>

      {/* Full Description */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {complaint.description || displayTitle}
      </p>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3 pb-3 border-b border-white/10">
        <span>Category: <span className="text-foreground capitalize">{complaint.category}</span></span>
        <span>•</span>
        <span>Status: <span className={`capitalize ${
          complaint.status === 'resolved' ? 'text-green-400' :
          complaint.status === 'escalated' ? 'text-destructive' :
          complaint.status === 'in_progress' ? 'text-blue-400' :
          'text-foreground'
        }`}>{complaint.status.replace('_', ' ')}</span></span>
        <span>•</span>
        <span>Priority: <span className={`font-mono ${
          complaint.priority >= 8 ? 'text-destructive' :
          complaint.priority >= 5 ? 'text-warning' :
          'text-primary'
        }`}>{complaint.priority}/10</span></span>
        {complaint.confidenceScore !== undefined && (
          <>
            <span>•</span>
            <span>Confidence: <span className="text-foreground">{Math.round(complaint.confidenceScore * 100)}%</span></span>
          </>
        )}
      </div>
      
      {/* Footer Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Auto-Escalates every 10s (Demo)
        </Badge>
        
        {complaint.agentDecision?.source === 'gemini' && (
          <Badge variant="outline" className="text-xs text-primary border-primary/30">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Advisory
          </Badge>
        )}
        
        {complaint.authenticityStatus && (
          <Badge variant="outline" className="text-xs">
            {complaint.authenticityStatus === 'real' ? '✓' : '⚠'} {complaint.authenticityStatus}
          </Badge>
        )}
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Complaint } from '@/types/complaint';
import {
    MapPin,
    Clock,
    AlertTriangle,
    ShieldCheck,
    ShieldAlert,
    ShieldQuestion,
    Brain,
    TrendingUp,
    Calendar,
    User,
    Coins,
} from 'lucide-react';

interface ComplaintDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    complaint: Complaint | null;
    onUpdateStatus?: (complaintId: string, status: string) => void;
}

export function ComplaintDetailModal({
    isOpen,
    onClose,
    complaint,
    onUpdateStatus,
}: ComplaintDetailModalProps) {
    if (!complaint) return null;

    // Get authenticity badge info
    const getAuthenticityBadge = (status: string, score: number) => {
        if (status === 'real' || score >= 0.6) {
            return {
                icon: ShieldCheck,
                color: 'text-green-400',
                bgColor: 'bg-green-500/10',
                borderColor: 'border-green-500/30',
                label: 'Verified Real',
            };
        } else if (status === 'uncertain' || (score >= 0.2 && score < 0.6)) {
            return {
                icon: ShieldQuestion,
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-500/10',
                borderColor: 'border-yellow-500/30',
                label: 'Needs Review',
            };
        } else {
            return {
                icon: ShieldAlert,
                color: 'text-red-400',
                bgColor: 'bg-red-500/10',
                borderColor: 'border-red-500/30',
                label: 'Flagged',
            };
        }
    };

    const badge = getAuthenticityBadge(complaint.authenticityStatus, complaint.confidenceScore);
    const BadgeIcon = badge.icon;

    const severityColor = (severity: string) => {
        if (severity === 'critical') return 'text-red-400 bg-red-500/10 border-red-500/30';
        if (severity === 'high') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
        if (severity === 'medium') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        return 'text-green-400 bg-green-500/10 border-green-500/30';
    };

    const formatDate = (date: string | Date) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        Complaint Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Uploaded Image */}
                    {complaint.imageBase64 && (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                            <img
                                src={complaint.imageBase64}
                                alt="Issue"
                                className="w-full max-h-[300px] object-cover"
                            />
                        </div>
                    )}

                    {/* Title and Status */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold">{complaint.title}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>{complaint.citizenName}</span>
                                <span className="text-white/20">•</span>
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(complaint.createdAt)}</span>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${complaint.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                                complaint.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                            }`}>
                            {complaint.status.replace('_', ' ')}
                        </span>
                    </div>

                    {/* AI Generated Description */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <div className="flex items-center gap-2 text-xs text-primary uppercase mb-2">
                            <Brain className="w-4 h-4" />
                            AI-Generated Description
                        </div>
                        <p className="text-sm leading-relaxed">{complaint.description}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Category</p>
                            <p className="text-sm font-semibold capitalize">{complaint.category}</p>
                        </div>
                        <div className={`rounded-xl border p-3 text-center ${severityColor(complaint.severity)}`}>
                            <p className="text-xs uppercase mb-1">Severity</p>
                            <p className="text-sm font-semibold uppercase">{complaint.severity}</p>
                        </div>
                        <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-center">
                            <p className="text-xs text-primary uppercase mb-1">Priority</p>
                            <p className="text-sm font-semibold text-primary">{complaint.priority}/10</p>
                        </div>
                        <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 text-center">
                            <p className="text-xs text-warning uppercase mb-1 flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Escalation
                            </p>
                            <p className="text-sm font-semibold text-warning">Level {complaint.escalationLevel}</p>
                        </div>
                    </div>

                    {/* Authenticity Score */}
                    <div className={`rounded-xl ${badge.bgColor} border ${badge.borderColor} p-4`}>
                        <div className="flex items-center gap-3">
                            <BadgeIcon className={`w-6 h-6 ${badge.color}`} />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-semibold ${badge.color}`}>{badge.label}</span>
                                    <span className={`text-lg font-mono font-bold ${badge.color}`}>
                                        {(complaint.confidenceScore * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">AI Confidence Score</p>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Location</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{complaint.citizenLocation}</p>
                        {complaint.coordinates && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {complaint.coordinates.latitude.toFixed(6)}, {complaint.coordinates.longitude.toFixed(6)}
                            </p>
                        )}
                    </div>

                    {/* Currency Earned Badge (if applicable) */}
                    {complaint.currencyEarned && (
                        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-3">
                            <Coins className="w-6 h-6 text-yellow-400" />
                            <div>
                                <p className="text-sm font-semibold text-yellow-400">
                                    Citizen earned {complaint.currencyEarned} CivicCoins
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Awarded when report was verified and marked in progress
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Agent Decision (if available) */}
                    {complaint.agentDecision && (
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                            <div className="flex items-center gap-2 text-xs text-primary uppercase mb-2">
                                <Brain className="w-4 h-4" />
                                AI Agent Decision
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>Source: <span className="text-foreground">{complaint.agentDecision.source}</span></p>
                                {complaint.agentDecision.raw && (
                                    <>
                                        <p>Department: <span className="text-foreground">{complaint.agentDecision.raw.department}</span></p>
                                        <p>Reasoning: <span className="text-foreground">{complaint.agentDecision.raw.reasoning}</span></p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        {complaint.status !== 'resolved' && onUpdateStatus && (
                            <>
                                {complaint.status !== 'in_progress' && (
                                    <Button
                                        className="flex-1"
                                        onClick={() => onUpdateStatus(complaint.id, 'in_progress')}
                                    >
                                        Mark In Progress
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                                    onClick={() => onUpdateStatus(complaint.id, 'resolved')}
                                >
                                    Mark Resolved
                                </Button>
                            </>
                        )}
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

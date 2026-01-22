import admin from 'firebase-admin';
import { firebaseService } from './firebase.service.js';
import { Complaint } from '../types/complaint.js';
import { geminiService } from './gemini.service.js';

const ACTIVE_STATUSES = [
  'submitted',
  'analyzed',
  'assigned',
  'acknowledged',
  'in_progress',
  'on_hold',
  'sla_warning',
  'escalated',
] as const;

// Dynamic watchdog interval: 1s in demo mode, 60s in production
const DEMO_SLA_SECONDS = Number(process.env.DEMO_SLA_SECONDS ?? '0');
const WATCHDOG_INTERVAL_MS = DEMO_SLA_SECONDS > 0 && DEMO_SLA_SECONDS <= 30 ? 1000 : 60000;
function getDeadline(complaint: Complaint): Date {
  return complaint.slaDeadline ?? complaint.expectedResolutionTime;
}

/**
 * Runs inside the Node process (no external scheduler) and enforces SLA deadlines.
 * - every 1s in demo mode (DEMO_SLA_SECONDS <= 30), 60s in production
 * - finds overdue, non-resolved complaints
 * - increments escalationLevel, updates status, extends SLA, appends timeline
 */
export class SLAWatchdogService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start() {
    if (this.timer) return;
    // jitter start slightly so multiple instances don't align perfectly
    const initialDelayMs = 500 + Math.floor(Math.random() * 1500);
    setTimeout(() => this.tick().catch((e) => console.error('SLA watchdog tick failed:', e)), initialDelayMs);
    this.timer = setInterval(() => {
      this.tick().catch((e) => console.error('SLA watchdog tick failed:', e));
    }, WATCHDOG_INTERVAL_MS);
    console.log(`⏱️  SLA watchdog started (${WATCHDOG_INTERVAL_MS}ms interval)`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * One scan cycle.
   * Exported for manual trigger via existing route if needed.
   */
  async tick(): Promise<{ scanned: number; escalated: number; updatedIds: string[] }> {
    if (this.running) return { scanned: 0, escalated: 0, updatedIds: [] };
    this.running = true;
    console.log(`[SLA WATCHDOG] Tick at ${new Date().toISOString()}`);
    try {
      const db = admin.firestore();
      const now = new Date();
      const nowTs = admin.firestore.Timestamp.fromDate(now);

      // Query by status first (cheap index), filter by deadline in memory for compatibility.
      const snap = await db
        .collection('complaints')
        .where('status', 'in', [...ACTIVE_STATUSES])
        .orderBy('updatedAt', 'desc')
        .limit(250)
        .get();

      const complaints = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      const overdue = complaints.filter((c) => {
        const deadline = c.slaDeadline?.toDate?.() || c.expectedResolutionTime?.toDate?.();
        if (!deadline) return false;
        return now.getTime() > deadline.getTime();
      });

      const updatedIds: string[] = [];
      const escalatedForAI: {
        id: string;
        department: string;
        severity: string;
        status: string;
        elapsedSeconds: number;
      }[] = [];
      for (const raw of overdue) {
        const complaint = (await firebaseService.getComplaint(raw.id)) as Complaint | null;
        if (!complaint) continue;

        // CRITICAL: Skip resolved or already-escalated complaints (idempotency)
        if (complaint.status === 'resolved' || complaint.status === 'escalated') continue;

        const deadline = getDeadline(complaint);
        const nowMs = now.getTime();
        const slaMs = deadline.getTime();

        // Double-check SLA breach with correct comparison
        if (nowMs <= slaMs) continue;

        const oldStatus = complaint.status;
        let newStatus: string;
        let newLevel: 0 | 1 | 2 | 3;
        let message: string;

        // STRICT one-way status transitions (idempotent)
        if (oldStatus === 'analyzed' || oldStatus === 'in_progress' || oldStatus === 'submitted') {
          newStatus = 'sla_warning';
          newLevel = 1;
          message = 'SLA breached – warning issued';
        } else if (oldStatus === 'sla_warning') {
          newStatus = 'escalated';
          newLevel = 2;
          message = 'SLA escalated to level 2';
        } else {
          // No further transitions (idempotency critical)
          continue;
        }

        const elapsedSeconds = Math.max(
          1,
          Math.round((now.getTime() - complaint.createdAt.getTime()) / 1000)
        );

        const demoSeconds = Number(process.env.DEMO_SLA_SECONDS ?? '10');
        const extensionMs =
          demoSeconds > 0 ? demoSeconds * 1000 : 24 * 60 * 60 * 1000;
        const newDeadline = new Date(now.getTime() + extensionMs);

        // Atomic Firestore update
        await firebaseService.updateComplaintFields(complaint.id, {
          escalationLevel: newLevel,
          status: newStatus as any,
          updatedAt: now,
          slaDeadline: newDeadline,
          expectedResolutionTime: newDeadline,
        });

        // Write timeline event ONLY when status changes (prevents quota exhaustion)
        await firebaseService.appendTimelineEvent(complaint.id, {
          type: 'system',
          action: newStatus === 'sla_warning' ? 'sla_warning' : 'escalated',
          message,
          timestamp: now,
        });

        // Also append audit entry
        await db.collection('complaints').doc(complaint.id).update({
          auditLog: admin.firestore.FieldValue.arrayUnion({
            timestamp: nowTs,
            action: newStatus === 'sla_warning' ? 'SLA warning issued' : `Escalated to level ${newLevel}`,
            actor: 'system',
            details: { 
              oldStatus, 
              newStatus, 
              prevLevel: complaint.escalationLevel ?? 0, 
              newLevel, 
              previousDeadline: admin.firestore.Timestamp.fromDate(deadline), 
              newDeadline: admin.firestore.Timestamp.fromDate(newDeadline) 
            },
          }),
        });

        console.log(`[SLA] ${complaint.id}: ${oldStatus} → ${newStatus}`);
        updatedIds.push(complaint.id);
        escalatedForAI.push({
          id: complaint.id,
          department: complaint.department ?? complaint.assignedDepartment,
          severity: complaint.severity,
          status: newStatus,
          elapsedSeconds,
        });
      }

      if (updatedIds.length) {
        console.log(
          `🚨 SLA watchdog updated ${updatedIds.length} complaint(s): ${updatedIds.join(', ')}`
        );
      }

      // Fire-and-forget advisory explanations; escalation already enforced.
      if (escalatedForAI.length) {
        void this.addEscalationExplanations(escalatedForAI).catch((e) =>
          console.error('Failed to add AI escalation justifications:', e)
        );
      }

      return { scanned: snap.size, escalated: updatedIds.length, updatedIds };
    } finally {
      this.running = false;
    }
  }

  /**
   * Advisory Gemini explanations for already-escalated complaints.
   * Not part of the critical path; failures fall back to deterministic messaging.
   */
  private async addEscalationExplanations(
    escalations: {
      id: string;
      department: string;
      severity: string;
      status: string;
      elapsedSeconds: number;
    }[]
  ): Promise<void> {
    for (const esc of escalations) {
      try {
        const justification = await geminiService.explainEscalation({
          department: esc.department,
          severity: esc.severity,
          elapsedSeconds: esc.elapsedSeconds,
          status: esc.status,
        });

        const message = justification
          ? `AI justification: ${justification}`
          : 'System escalation enforced due to SLA breach.';

        await firebaseService.appendTimelineEvent(esc.id, {
          type: 'system',
          action: 'ai_escalation_justification',
          message,
          timestamp: new Date(),
        });
      } catch {
        await firebaseService.appendTimelineEvent(esc.id, {
          type: 'system',
          action: 'ai_escalation_justification_failed',
          message: 'System escalation enforced due to SLA breach. AI justification unavailable.',
          timestamp: new Date(),
        });
      }
    }
  }
}

export const slaWatchdogService = new SLAWatchdogService();


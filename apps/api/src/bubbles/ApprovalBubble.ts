import { ResendBubble } from './ResendBubble';
import { createPendingApproval } from '../routes/approve';

export interface ApprovalConfig {
  to: string;
  subject?: string;
  data: Record<string, unknown>;
  timeoutMs?: number; // How long to wait for approval (default: 24 hours)
}

export interface ApprovalResult {
  success: boolean;
  approved: boolean;
  runId: string;
  error?: string;
  timedOut?: boolean;
}

export class ApprovalBubble {
  private config: ApprovalConfig;

  constructor(config: ApprovalConfig) {
    this.config = config;
  }

  async action(): Promise<ApprovalResult> {
    const { to, subject, data, timeoutMs = 24 * 60 * 60 * 1000 } = this.config;

    // Generate unique run ID
    const runId = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[Approval] Starting approval flow: ${runId}`);
    console.log(`[Approval] Sending email to: ${to}`);

    try {
      // Send approval email
      const resend = new ResendBubble({
        to,
        subject: subject || '🔔 Approval Required: Workflow Update',
        approvalMode: true,
        runId,
        approvalData: data,
      });

      const emailResult = await resend.action();

      if (!emailResult.success) {
        return {
          success: false,
          approved: false,
          runId,
          error: `Failed to send approval email: ${emailResult.error}`,
        };
      }

      console.log(`[Approval] Email sent successfully. Waiting for approval...`);

      // Create pending approval and wait for response
      const approvalPromise = createPendingApproval(runId, data);

      // Race between approval and timeout
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      });

      const approved = await Promise.race([
        approvalPromise,
        timeoutPromise.then(() => {
          console.log(`[Approval] Timed out waiting for approval: ${runId}`);
          return 'timeout' as const;
        }),
      ]);

      if (approved === 'timeout') {
        return {
          success: true,
          approved: false,
          runId,
          timedOut: true,
        };
      }

      console.log(`[Approval] ${runId} resolved: ${approved ? 'APPROVED' : 'REJECTED'}`);

      return {
        success: true,
        approved: approved as boolean,
        runId,
      };
    } catch (error) {
      console.error('[Approval] Error:', error);
      return {
        success: false,
        approved: false,
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

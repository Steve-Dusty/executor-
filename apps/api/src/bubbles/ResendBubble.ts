import { Resend } from 'resend';

export interface ResendConfig {
  to: string;
  subject: string;
  previewText?: string;
  contentHtml?: string;
  contentText?: string;
  // For approval emails
  approvalMode?: boolean;
  runId?: string;
  approvalData?: Record<string, unknown>;
  baseUrl?: string;
}

export interface ResendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class ResendBubble {
  private config: ResendConfig;
  private client: Resend;

  constructor(config: ResendConfig) {
    this.config = config;

    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required');
    }

    this.client = new Resend(process.env.RESEND_API_KEY);
  }

  async action(): Promise<ResendResult> {
    const {
      to,
      subject,
      previewText,
      contentHtml,
      contentText,
      approvalMode,
      runId,
      approvalData,
      baseUrl = process.env.API_BASE_URL || 'http://localhost:3001',
    } = this.config;

    try {
      let html = contentHtml;
      let text = contentText;

      // If approval mode, generate approval email
      if (approvalMode && runId) {
        const approveUrl = `${baseUrl}/approve/${runId}?action=yes`;
        const rejectUrl = `${baseUrl}/approve/${runId}?action=no`;

        html = this.generateApprovalEmailHtml(approvalData, approveUrl, rejectUrl);
        text = this.generateApprovalEmailText(approvalData, approveUrl, rejectUrl);
      }

      console.log(`[Resend] Sending email to: ${to}`);
      console.log(`[Resend] Subject: ${subject}`);

      const result = await this.client.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Workflow System <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || text || 'No content',
        text: text,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log(`[Resend] Email sent successfully: ${result.data?.id}`);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error('[Resend] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateApprovalEmailHtml(
    data: Record<string, unknown> | undefined,
    approveUrl: string,
    rejectUrl: string
  ): string {
    const summary = data
      ? Object.entries(data)
          .map(([key, value]) => `<li><strong>${key}:</strong> ${JSON.stringify(value)}</li>`)
          .join('')
      : '<li>No additional data</li>';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .data-list { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .data-list ul { margin: 0; padding-left: 20px; }
    .data-list li { margin: 8px 0; }
    .buttons { display: flex; gap: 15px; margin-top: 25px; justify-content: center; }
    .btn { display: inline-block; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .btn-approve { background: #10b981; color: white; }
    .btn-reject { background: #ef4444; color: white; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 Approval Required</h1>
    <p>A workflow is waiting for your approval</p>
  </div>
  <div class="content">
    <h2>Proposed Changes</h2>
    <div class="data-list">
      <ul>${summary}</ul>
    </div>
    <div class="buttons">
      <a href="${approveUrl}" class="btn btn-approve">✅ Approve</a>
      <a href="${rejectUrl}" class="btn btn-reject">❌ Reject</a>
    </div>
  </div>
  <div class="footer">
    <p>This is an automated message from your workflow system.</p>
  </div>
</body>
</html>
    `.trim();
  }

  private generateApprovalEmailText(
    data: Record<string, unknown> | undefined,
    approveUrl: string,
    rejectUrl: string
  ): string {
    const summary = data
      ? Object.entries(data)
          .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
          .join('\n')
      : '- No additional data';

    return `
APPROVAL REQUIRED

A workflow is waiting for your approval.

Proposed Changes:
${summary}

To APPROVE, click: ${approveUrl}

To REJECT, click: ${rejectUrl}

This is an automated message from your workflow system.
    `.trim();
  }
}

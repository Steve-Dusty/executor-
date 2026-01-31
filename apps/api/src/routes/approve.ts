import { Hono } from 'hono';
import { html } from 'hono/html';

const approveRouter = new Hono();

// Store for pending approvals (in production, use Redis or a database)
interface PendingApproval {
  runId: string;
  workflowId?: string;
  nodeId?: string;
  data: Record<string, unknown>;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: Date;
  resolveCallback?: (approved: boolean) => void;
}

export const pendingApprovals = new Map<string, PendingApproval>();

// Create a pending approval
export function createPendingApproval(
  runId: string,
  data: Record<string, unknown>,
  workflowId?: string,
  nodeId?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    pendingApprovals.set(runId, {
      runId,
      workflowId,
      nodeId,
      data,
      createdAt: new Date(),
      status: 'pending',
      resolveCallback: resolve,
    });

    console.log(`[Approval] Created pending approval: ${runId}`);
  });
}

// Handle approval/rejection via GET request (email link click)
approveRouter.get('/:runId', async (c) => {
  const runId = c.req.param('runId');
  const action = c.req.query('action');

  console.log(`[Approval] Received ${action} for runId: ${runId}`);

  const approval = pendingApprovals.get(runId);

  if (!approval) {
    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Approval Not Found</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                   display: flex; justify-content: center; align-items: center; min-height: 100vh;
                   margin: 0; background: #f3f4f6; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    text-align: center; max-width: 400px; }
            h1 { color: #ef4444; margin-bottom: 16px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Not Found</h1>
            <p>This approval request was not found or has already been processed.</p>
          </div>
        </body>
      </html>
    `);
  }

  if (approval.status !== 'pending') {
    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Already Processed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                   display: flex; justify-content: center; align-items: center; min-height: 100vh;
                   margin: 0; background: #f3f4f6; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    text-align: center; max-width: 400px; }
            h1 { color: #f59e0b; margin-bottom: 16px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ Already Processed</h1>
            <p>This request was already ${approval.status} on ${approval.resolvedAt?.toISOString()}.</p>
          </div>
        </body>
      </html>
    `);
  }

  const approved = action === 'yes';
  approval.status = approved ? 'approved' : 'rejected';
  approval.resolvedAt = new Date();

  // Resolve the promise so the workflow can continue
  if (approval.resolveCallback) {
    approval.resolveCallback(approved);
  }

  console.log(`[Approval] ${runId} was ${approval.status}`);

  const bgColor = approved ? '#10b981' : '#ef4444';
  const icon = approved ? '✅' : '❌';
  const title = approved ? 'Approved!' : 'Rejected';
  const message = approved
    ? 'The workflow will now continue with the updates.'
    : 'The workflow has been stopped. No changes will be made.';

  return c.html(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 display: flex; justify-content: center; align-items: center; min-height: 100vh;
                 margin: 0; background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%); }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                  text-align: center; max-width: 400px; animation: slideIn 0.3s ease-out; }
          @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          h1 { color: ${bgColor}; margin-bottom: 16px; font-size: 2rem; }
          .icon { font-size: 4rem; margin-bottom: 16px; }
          p { color: #6b7280; line-height: 1.6; }
          .details { background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px; text-align: left; font-size: 0.875rem; }
          .details code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${icon}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <div class="details">
            <p><strong>Run ID:</strong> <code>${runId}</code></p>
            <p><strong>Processed at:</strong> ${approval.resolvedAt?.toISOString()}</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// API endpoint to check approval status
approveRouter.get('/:runId/status', (c) => {
  const runId = c.req.param('runId');
  const approval = pendingApprovals.get(runId);

  if (!approval) {
    return c.json({ error: 'Approval not found' }, 404);
  }

  return c.json({
    runId: approval.runId,
    status: approval.status,
    createdAt: approval.createdAt,
    resolvedAt: approval.resolvedAt,
  });
});

// List all pending approvals
approveRouter.get('/', (c) => {
  const approvals = Array.from(pendingApprovals.values()).map((a) => ({
    runId: a.runId,
    status: a.status,
    createdAt: a.createdAt,
    resolvedAt: a.resolvedAt,
    data: a.data,
  }));

  return c.json({ approvals });
});

export { approveRouter };

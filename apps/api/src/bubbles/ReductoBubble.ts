import Reducto from 'reductoai';

export interface ReductoConfig {
  mode: 'parse' | 'extract';
  documentUrl?: string;
  schema?: Record<string, unknown>;
  waitForCompletion?: boolean; // Poll until done (default: true)
  maxWaitMs?: number; // Max wait time (default: 60000)
}

export interface ReductoResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export class ReductoBubble {
  private config: ReductoConfig;
  private client: Reducto;

  constructor(config: ReductoConfig) {
    this.config = config;

    if (!process.env.REDUCTO_API_KEY) {
      throw new Error('REDUCTO_API_KEY is required');
    }

    this.client = new Reducto({ apiKey: process.env.REDUCTO_API_KEY });
  }

  async action(): Promise<ReductoResult> {
    const { mode, documentUrl, schema, waitForCompletion = true, maxWaitMs = 60000 } = this.config;

    try {
      switch (mode) {
        case 'parse': {
          if (!documentUrl) {
            throw new Error('documentUrl is required for parse mode');
          }

          console.log(`[Reducto] Parsing document: ${documentUrl}`);

          const result = await this.client.parse.run({
            input: documentUrl,
          });

          // Handle async response - poll for completion
          if ('job_id' in result) {
            if (!waitForCompletion) {
              return {
                success: true,
                data: { jobId: result.job_id, status: 'processing' },
              };
            }

            // Poll for completion
            const finalResult = await this.pollForCompletion(result.job_id, maxWaitMs);
            return finalResult;
          }

          // Sync response with parsed content
          return {
            success: true,
            data: {
              chunks: result.result?.chunks?.map((chunk) => ({
                content: chunk.content,
                metadata: chunk.metadata,
              })),
              metadata: result.result?.metadata,
              fullText: result.result?.chunks?.map((c) => c.content).join('\n\n'),
            },
          };
        }

        case 'extract': {
          if (!documentUrl) {
            throw new Error('documentUrl is required for extract mode');
          }
          if (!schema) {
            throw new Error('schema is required for extract mode');
          }

          console.log(`[Reducto] Extracting from document: ${documentUrl}`);

          const result = await this.client.extract.run({
            input: documentUrl,
            schema,
          });

          if ('job_id' in result) {
            if (!waitForCompletion) {
              return {
                success: true,
                data: { jobId: result.job_id, status: 'processing' },
              };
            }
            return await this.pollForCompletion(result.job_id, maxWaitMs);
          }

          return {
            success: true,
            data: { extracted: result.result },
          };
        }

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      console.error('[Reducto] Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async pollForCompletion(jobId: string, maxWaitMs: number): Promise<ReductoResult> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    console.log(`[Reducto] Polling for job ${jobId}...`);

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const jobResult = await this.client.job.get(jobId);

        if ('status' in jobResult && jobResult.status === 'completed') {
          console.log(`[Reducto] Job ${jobId} completed`);
          return {
            success: true,
            data: {
              jobId,
              status: 'completed',
              result: jobResult.result,
              chunks: jobResult.result?.chunks?.map((chunk: { content?: string; metadata?: unknown }) => ({
                content: chunk.content,
                metadata: chunk.metadata,
              })),
              fullText: jobResult.result?.chunks?.map((c: { content?: string }) => c.content).join('\n\n'),
            },
          };
        }

        if ('status' in jobResult && jobResult.status === 'failed') {
          return {
            success: false,
            data: null,
            error: `Job failed: ${jobResult.error || 'Unknown error'}`,
          };
        }

        // Still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`[Reducto] Poll error:`, error);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    return {
      success: false,
      data: { jobId, status: 'timeout' },
      error: `Job ${jobId} timed out after ${maxWaitMs}ms`,
    };
  }
}

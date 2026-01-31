import Reducto from 'reductoai';

export interface ReductoConfig {
  mode: 'parse' | 'extract';
  documentUrl?: string;
  schema?: Record<string, unknown>;
  waitForCompletion?: boolean; // Poll until done (default: true)
  maxWaitMs?: number; // Max wait time (default: 60000)
  pageRange?: { start: number; end: number }; // Limit pages to process
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
    const { mode, documentUrl, schema, waitForCompletion = true, maxWaitMs = 60000, pageRange } = this.config;

    try {
      switch (mode) {
        case 'parse': {
          if (!documentUrl) {
            throw new Error('documentUrl is required for parse mode');
          }

          console.log(`[Reducto] Parsing document: ${documentUrl}`);
          if (pageRange) {
            console.log(`[Reducto] Page range: ${pageRange.start}-${pageRange.end}`);
          }

          // Use run() which handles async internally and returns job_id
          const result = await this.client.parse.run({
            input: documentUrl,
            ...(pageRange && {
              settings: {
                page_range: pageRange
              }
            }),
          });

          // Handle async response - poll for completion
          if ('job_id' in result) {
            if (!waitForCompletion) {
              return {
                success: true,
                data: { jobId: result.job_id, status: 'processing' },
              };
            }
            return await this.pollForCompletion(result.job_id, maxWaitMs, false);
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

          console.log(`[Reducto] Extracting structured data from: ${documentUrl}`);
          console.log(`[Reducto] Schema fields: ${Object.keys(schema.properties || schema).join(', ')}`);
          if (pageRange) {
            console.log(`[Reducto] Page range: ${pageRange.start}-${pageRange.end}`);
          }

          // Use runJob() for async submission - returns immediately with job_id
          const submission = await this.client.extract.runJob({
            input: documentUrl,
            schema,
            ...(pageRange && {
              parsing: {
                settings: {
                  page_range: pageRange
                }
              }
            }),
          });

          if (!waitForCompletion) {
            return {
              success: true,
              data: { jobId: submission.job_id, status: 'processing' },
            };
          }

          // Poll for completion
          return await this.pollForCompletion(submission.job_id, maxWaitMs, true);
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

  private async pollForCompletion(jobId: string, maxWaitMs: number, isExtract = false): Promise<ReductoResult> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second for faster polling

    console.log(`[Reducto] Polling for job ${jobId} (mode: ${isExtract ? 'extract' : 'parse'})...`);

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const jobResult = await this.client.job.get(jobId);
        const status = ('status' in jobResult ? String(jobResult.status).toLowerCase() : '');

        if (status === 'completed') {
          console.log(`[Reducto] Job ${jobId} completed`);

          // Different response format for extract vs parse
          if (isExtract) {
            return {
              success: true,
              data: {
                jobId,
                status: 'completed',
                extracted: jobResult.result,
                // Flatten extracted data for easier downstream access
                ...jobResult.result,
              },
            };
          }

          // Parse mode returns chunks - note: nested under result.result
          const parseResult = (jobResult.result as { result?: { chunks?: Array<{ content?: string; metadata?: unknown }> } })?.result;
          const chunks = parseResult?.chunks || [];
          return {
            success: true,
            data: {
              jobId,
              status: 'completed',
              result: jobResult.result,
              chunks: chunks.map((chunk) => ({
                content: chunk.content,
                metadata: chunk.metadata,
              })),
              fullText: chunks.map((c) => c.content).join('\n\n'),
            },
          };
        }

        if (status === 'failed') {
          return {
            success: false,
            data: null,
            error: `Job failed: ${(jobResult as { error?: string }).error || 'Unknown error'}`,
          };
        }

        console.log(`[Reducto] Job ${jobId} status: ${status} (${Date.now() - startTime}ms elapsed)`);

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

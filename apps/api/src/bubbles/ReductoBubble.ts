import Reducto from 'reductoai';

export interface ReductoConfig {
  mode: 'parse' | 'extract';
  // For parse mode
  documentUrl?: string;
  // For extract mode
  schema?: Record<string, unknown>;
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
    const { mode, documentUrl, schema } = this.config;

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

          // Handle async response
          if ('job_id' in result) {
            return {
              success: true,
              data: {
                jobId: result.job_id,
                status: 'processing',
                message: 'Document is being processed asynchronously',
              },
            };
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

          // Handle async response
          if ('job_id' in result) {
            return {
              success: true,
              data: {
                jobId: result.job_id,
                status: 'processing',
              },
            };
          }

          return {
            success: true,
            data: {
              extracted: result.result,
            },
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
}

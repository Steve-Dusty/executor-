import { FirecrawlClient } from '@mendable/firecrawl-js';

export interface FirecrawlConfig {
  mode: 'scrape' | 'crawl' | 'search' | 'extract' | 'map';
  url?: string;
  urls?: string[]; // For extract mode with multiple URLs
  query?: string;
  limit?: number;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'json')[];
  // For extract mode
  schema?: Record<string, unknown>;
  prompt?: string; // Natural language extraction prompt
  // For scrape with actions
  actions?: Array<{
    type: 'click' | 'scroll' | 'wait' | 'type';
    selector?: string;
    milliseconds?: number;
    text?: string;
    direction?: 'up' | 'down';
  }>;
}

export interface FirecrawlResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export class FirecrawlBubble {
  private config: FirecrawlConfig;
  private client: FirecrawlClient;

  constructor(config: FirecrawlConfig) {
    this.config = config;

    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is required');
    }

    this.client = new FirecrawlClient({ apiKey: process.env.FIRECRAWL_API_KEY });
  }

  async action(): Promise<FirecrawlResult> {
    const { mode, url, urls, query, limit = 5, formats = ['markdown'], schema, prompt, actions } = this.config;

    try {
      switch (mode) {
        case 'scrape': {
          if (!url) throw new Error('URL is required for scrape mode');

          console.log(`[Firecrawl] Scraping: ${url}`);

          const scrapeOptions: Record<string, unknown> = { formats };
          if (actions && actions.length > 0) {
            scrapeOptions.actions = actions;
          }

          const result = await this.client.scrape(url, scrapeOptions);

          return {
            success: true,
            data: {
              url,
              content: result.markdown || result.html,
              metadata: result.metadata,
              links: result.links,
              json: result.json, // If JSON format requested
            },
          };
        }

        case 'crawl': {
          if (!url) throw new Error('URL is required for crawl mode');

          console.log(`[Firecrawl] Crawling: ${url} (limit: ${limit})`);
          const crawlJob = await this.client.crawl.start(url, {
            limit,
            scrapeOptions: { formats },
          });

          const result = await crawlJob.waitUntilDone();

          return {
            success: true,
            data: {
              url,
              pages: result.data?.map((page: { url?: string; markdown?: string; metadata?: unknown }) => ({
                url: page.url,
                content: page.markdown,
                metadata: page.metadata,
              })),
              totalPages: result.data?.length || 0,
            },
          };
        }

        case 'search': {
          if (!query) throw new Error('Query is required for search mode');

          console.log(`[Firecrawl] Searching: "${query}" (limit: ${limit})`);
          const result = await this.client.search(query, { limit }) as { web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }> };

          const items = result.web || [];

          return {
            success: true,
            data: {
              query,
              results: items.map((item) => ({
                url: item.url,
                title: item.title,
                description: item.description,
                content: item.markdown,
              })),
              totalResults: items.length,
            },
          };
        }

        case 'extract': {
          const targetUrls = urls || (url ? [url] : []);
          if (targetUrls.length === 0) throw new Error('URL(s) required for extract mode');
          if (!schema && !prompt) throw new Error('Schema or prompt required for extract mode');

          console.log(`[Firecrawl] Extracting from ${targetUrls.length} URL(s)`);

          const extractOptions: Record<string, unknown> = { urls: targetUrls };
          if (schema) extractOptions.schema = schema;
          if (prompt) extractOptions.prompt = prompt;

          const result = await this.client.extract(extractOptions as { urls: string[]; schema?: Record<string, unknown>; prompt?: string });

          return {
            success: true,
            data: {
              urls: targetUrls,
              extracted: result.data,
              status: result.status,
            },
          };
        }

        case 'map': {
          if (!url) throw new Error('URL is required for map mode');

          console.log(`[Firecrawl] Mapping: ${url}`);
          const result = await this.client.map(url, { limit });

          return {
            success: true,
            data: {
              url,
              links: result.links,
              totalLinks: result.links?.length || 0,
            },
          };
        }

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      console.error('[Firecrawl] Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

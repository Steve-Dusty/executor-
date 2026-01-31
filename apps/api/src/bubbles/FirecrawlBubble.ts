import { FirecrawlClient } from '@mendable/firecrawl-js';

export interface FirecrawlConfig {
  mode: 'scrape' | 'crawl' | 'search';
  url?: string;
  query?: string;
  limit?: number;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
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
    const { mode, url, query, limit = 5, formats = ['markdown'] } = this.config;

    try {
      switch (mode) {
        case 'scrape': {
          if (!url) throw new Error('URL is required for scrape mode');

          console.log(`[Firecrawl] Scraping: ${url}`);
          const result = await this.client.scrape(url, { formats });

          return {
            success: true,
            data: {
              url,
              content: result.markdown || result.html,
              metadata: result.metadata,
              links: result.links,
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

          // Wait for crawl to complete
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

          // The search result has a 'web' property containing the results
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

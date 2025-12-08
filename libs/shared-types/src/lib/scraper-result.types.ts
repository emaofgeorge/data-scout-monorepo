/**
 * Result of a scraping operation
 */
export interface ScraperResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  scraperName: string;
  itemsProcessed?: number;
}

/**
 * Scraper execution status
 */
export interface ScraperStatus {
  name: string;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'error';
  errorMessage?: string;
}

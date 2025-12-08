/**
 * Interface for scraper configuration
 */
export interface ScraperConfig {
  name: string;
  url: string;
  interval?: number;
}

/**
 * Base interface for all scrapers
 */
export interface IScraper<T = unknown> {
  /**
   * Initialize the scraper
   */
  initialize(): Promise<void>;

  /**
   * Execute the scraping logic
   */
  scrape(): Promise<T>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

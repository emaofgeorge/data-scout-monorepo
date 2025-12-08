import { IScraper, ScraperConfig } from './scraper.interface.js';

/**
 * Base abstract class for scrapers
 * Provides common functionality that all scrapers can use
 */
export abstract class BaseScraper<T = unknown> implements IScraper<T> {
  protected config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  /**
   * Initialize the scraper
   * Override this method to add custom initialization logic
   */
  async initialize(): Promise<void> {
    // Placeholder for initialization logic
  }

  /**
   * Execute the scraping logic
   * Must be implemented by concrete scrapers
   */
  abstract scrape(): Promise<T>;

  /**
   * Cleanup resources
   * Override this method to add custom cleanup logic
   */
  async cleanup(): Promise<void> {
    // Placeholder for cleanup logic
  }
}

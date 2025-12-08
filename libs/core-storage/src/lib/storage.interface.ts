/**
 * Storage configuration
 */
export interface StorageConfig {
  type: 'json' | 'database' | 'cloud';
  path?: string;
  connectionString?: string;
}

/**
 * Base interface for storage adapters
 */
export interface IStorageAdapter<T = unknown> {
  /**
   * Save data to storage
   */
  save(data: T): Promise<void>;

  /**
   * Load data from storage
   */
  load(): Promise<T | null>;

  /**
   * Check if storage is available
   */
  isAvailable(): Promise<boolean>;
}

import { IStorageAdapter, StorageConfig } from './storage.interface.js';

/**
 * Factory for creating storage adapters
 * Supports multiple storage backends (JSON, Database, Cloud)
 */
export class StorageFactory {
  /**
   * Create a storage adapter based on configuration
   */
  static create<T = unknown>(config: StorageConfig): IStorageAdapter<T> {
    // Placeholder - will be implemented later with actual adapters
    throw new Error('Storage adapters not yet implemented');
  }
}

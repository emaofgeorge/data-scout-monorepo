import { INotificationAdapter, NotificationConfig } from './notification.interface.js';

/**
 * Factory for creating notification adapters
 * Supports multiple notification channels (Email, Slack, Webhook, Console)
 */
export class NotificationFactory {
  /**
   * Create a notification adapter based on configuration
   */
  static create(config: NotificationConfig): INotificationAdapter {
    // Placeholder - will be implemented later with actual adapters
    throw new Error('Notification adapters not yet implemented');
  }
}

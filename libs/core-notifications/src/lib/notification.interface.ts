/**
 * Notification configuration
 */
export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'console';
  recipients?: string[];
  webhookUrl?: string;
}

/**
 * Notification message
 */
export interface NotificationMessage {
  title: string;
  body: string;
  severity?: 'info' | 'warning' | 'error';
  timestamp?: Date;
}

/**
 * Base interface for notification adapters
 */
export interface INotificationAdapter {
  /**
   * Send a notification
   */
  send(message: NotificationMessage): Promise<void>;

  /**
   * Check if notification service is available
   */
  isAvailable(): Promise<boolean>;
}

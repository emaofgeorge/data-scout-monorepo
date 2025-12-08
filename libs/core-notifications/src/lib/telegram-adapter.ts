import axios from 'axios';
import {
  INotificationAdapter,
  NotificationMessage,
} from './notification.interface';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/**
 * Telegram Notification Adapter
 * Sends notifications via Telegram Bot API
 */
export class TelegramNotificationAdapter implements INotificationAdapter {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async send(message: NotificationMessage): Promise<void> {
    try {
      const emoji = this.getSeverityEmoji(message.severity);
      const text = this.formatMessage(message, emoji);

      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error('[Telegram] Failed to send notification:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data.ok === true;
    } catch (error) {
      console.error('[Telegram] Bot not available:', error);
      return false;
    }
  }

  private getSeverityEmoji(severity?: string): string {
    switch (severity) {
      case 'error':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  }

  private formatMessage(message: NotificationMessage, emoji: string): string {
    const timestamp = message.timestamp
      ? new Date(message.timestamp).toLocaleString('it-IT')
      : new Date().toLocaleString('it-IT');

    return `${emoji} <b>${message.title}</b>\n\n${message.body}\n\n<i>${timestamp}</i>`;
  }
}

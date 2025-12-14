import { IkeaProduct } from '@data-scout/shared-types';
import {
  INotificationAdapter,
  TelegramNotificationAdapter,
} from '@data-scout/core-notifications';
import { BotUserService } from './bot-user.service';

export interface NotificationServiceConfig {
  enabled: boolean;
  environment: 'development' | 'production';
  telegram?: {
    botToken: string;
  };
}

/**
 * Notification Service for IKEA Scraper
 * Handles product change notifications using bot user preferences from Firestore
 */
export class NotificationService {
  private adapters: Map<string, INotificationAdapter> = new Map();
  private config: NotificationServiceConfig;
  private userService: BotUserService;

  constructor(config: NotificationServiceConfig) {
    this.config = config;
    this.userService = new BotUserService();
  }

  /**
   * Get or create Telegram adapter for a chat ID
   */
  private getTelegramAdapter(chatId: string): INotificationAdapter | null {
    if (!this.adapters.has(chatId) && this.config.telegram) {
      const adapter = new TelegramNotificationAdapter({
        botToken: this.config.telegram.botToken,
        chatId: chatId,
      });
      this.adapters.set(chatId, adapter);
    }
    return this.adapters.get(chatId) || null;
  }

  /**
   * Notify about new products added to a store
   */
  async notifyProductsAdded(
    storeId: string,
    storeName: string,
    products: IkeaProduct[]
  ): Promise<void> {
    if (!this.config.enabled || products.length === 0) return;

    // Get users subscribed to this store with preferences from Firestore
    const subscribedUsers =
      await this.userService.getUsersSubscribedToStoreWithPreferences(storeId);

    if (this.config.environment === 'development') {
      // Log to console in development
      for (const product of products) {
        const message = this.formatProductAddedMessage(storeName, product);
        console.log(`\n🆕 [Notification] ${message.title}`);
        console.log(`   ${message.body}`);
        console.log(`   Subscribers: ${subscribedUsers.length}`);
      }
    } else if (this.config.environment === 'production') {
      // Send to subscribed users in production (respect user preferences)
      for (const product of products) {
        const message = this.formatProductAddedMessage(storeName, product);

        for (const u of subscribedUsers) {
          if (!u.preferences.notifyOnNewProducts) continue;

          const chatId = u.chatId;
          try {
            const adapter = this.getTelegramAdapter(chatId);
            if (adapter) {
              await adapter.send(message);
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `Failed to send notification to chat ${chatId}:`,
              errorMessage
            );
            // If bot was blocked, deactivate user
            if (
              typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof error.response === 'object' &&
              error.response !== null &&
              'error_code' in error.response &&
              error.response.error_code === 403
            ) {
              await this.userService.deactivateUser(u.userId);
            }
          }
        }
      }
    }
  }

  /**
   * Notify about products removed from a store
   */
  async notifyProductsRemoved(
    storeId: string,
    storeName: string,
    products: IkeaProduct[]
  ): Promise<void> {
    if (!this.config.enabled || products.length === 0) return;

    // Get users subscribed to this store with preferences from Firestore
    const subscribedUsers =
      await this.userService.getUsersSubscribedToStoreWithPreferences(storeId);

    if (this.config.environment === 'development') {
      // Log to console in development
      for (const product of products) {
        const message = this.formatProductRemovedMessage(storeName, product);
        console.log(`\n🔴 [Notification] ${message.title}`);
        console.log(`   ${message.body}`);
        console.log(`   Subscribers: ${subscribedUsers.length}`);
      }
    } else if (this.config.environment === 'production') {
      // Send to subscribed users in production (respect user preferences)
      for (const product of products) {
        const message = this.formatProductRemovedMessage(storeName, product);

        for (const u of subscribedUsers) {
          if (!u.preferences.notifyOnRemovedProducts) continue;

          const chatId = u.chatId;
          try {
            const adapter = this.getTelegramAdapter(chatId);
            if (adapter) {
              await adapter.send(message);
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `Failed to send notification to chat ${chatId}:`,
              errorMessage
            );
            // If bot was blocked, deactivate user
            if (
              typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof error.response === 'object' &&
              error.response !== null &&
              'error_code' in error.response &&
              error.response.error_code === 403
            ) {
              await this.userService.deactivateUser(u.userId);
            }
          }
        }
      }
    }
  }

  private formatProductAddedMessage(
    storeName: string,
    product: IkeaProduct
  ): { title: string; body: string; severity: 'info' } {
    const discount = product.price.discount
      ? ` (-${product.price.discount}%)`
      : '';
    const price = `€${product.price.current}${discount}`;

    return {
      title: `Nuovo Prodotto - ${storeName}`,
      body: `${product.name}\n💰 ${price}\n🔗 ${product.url}`,
      severity: 'info',
    };
  }

  private formatProductRemovedMessage(
    storeName: string,
    product: IkeaProduct
  ): { title: string; body: string; severity: 'warning' } {
    return {
      title: `Prodotto Rimosso - ${storeName}`,
      body: `${product.name}\n💰 Era: €${product.price.current}`,
      severity: 'warning',
    };
  }

  /**
   * Notify about price changes for products in a store
   */
  async notifyPriceChanges(
    storeId: string,
    storeName: string,
    products: IkeaProduct[]
  ): Promise<void> {
    if (!this.config.enabled || products.length === 0) return;

    const subscribedUsers =
      await this.userService.getUsersSubscribedToStoreWithPreferences(storeId);

    if (this.config.environment === 'development') {
      for (const product of products) {
        const message = this.formatPriceChangeMessage(storeName, product);
        console.log(`\n🔄 [Price] ${message.title}`);
        console.log(`   ${message.body}`);
        console.log(`   Subscribers: ${subscribedUsers.length}`);
      }
    } else {
      for (const product of products) {
        const message = this.formatPriceChangeMessage(storeName, product);
        for (const u of subscribedUsers) {
          if (!u.preferences.notifyOnPriceChanges) continue;
          const chatId = u.chatId;
          try {
            const adapter = this.getTelegramAdapter(chatId);
            if (adapter) {
              await adapter.send(message);
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `Failed to send price change to ${chatId}:`,
              errorMessage
            );
            if (
              typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof error.response === 'object' &&
              error.response !== null &&
              'error_code' in error.response &&
              error.response.error_code === 403
            ) {
              await this.userService.deactivateUser(u.userId);
            }
          }
        }
      }
    }
  }

  private formatPriceChangeMessage(
    storeName: string,
    product: IkeaProduct
  ): { title: string; body: string; severity: 'info' } {
    const oldPrice = product.price.original ?? product.price.current;
    const newPrice = product.price.current;
    const discount = product.price.discount
      ? ` (-${product.price.discount}%)`
      : '';
    return {
      title: `Cambio Prezzo - ${storeName}`,
      body: `${product.name}\nDa: €${oldPrice} → A: €${newPrice}${discount}\n🔗 ${product.url}`,
      severity: 'info',
    };
  }
}

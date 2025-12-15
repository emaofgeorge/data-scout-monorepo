import { IkeaProduct } from '@data-scout/shared-types';
import { Telegraf } from 'telegraf';
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
  private bot?: Telegraf;
  private config: NotificationServiceConfig;
  private userService: BotUserService;

  constructor(config: NotificationServiceConfig) {
    this.config = config;
    this.userService = new BotUserService();

    // Initialize Telegram bot if configured
    if (config.telegram?.botToken) {
      this.bot = new Telegraf(config.telegram.botToken);
    }
  }

  /**
   * Send message with photo to Telegram
   */
  private async sendPhotoMessage(
    chatId: string,
    photoUrl: string,
    caption: string
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.telegram.sendPhoto(chatId, photoUrl, {
        caption,
        parse_mode: 'HTML',
      });
      return true;
    } catch (error: any) {
      // Fallback to text message if photo fails
      console.warn(
        `Failed to send photo, falling back to text: ${error.message}`
      );
      return await this.sendTextMessage(chatId, caption);
    }
  }

  /**
   * Send text-only message to Telegram
   */
  private async sendTextMessage(
    chatId: string,
    message: string
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        // disable_web_page_preview: false,
      });
      return true;
    } catch (error: any) {
      // Handle bot blocked or chat deleted
      if (error.response?.error_code === 403) {
        console.warn(`⚠️  User ${chatId} blocked the bot - deactivating`);
        await this.userService.deactivateUser(chatId);
        return false;
      }

      if (
        error.response?.error_code === 400 &&
        error.response?.description?.includes('chat not found')
      ) {
        console.warn(`⚠️  Chat ${chatId} not found - deactivating user`);
        await this.userService.deactivateUser(chatId);
        return false;
      }

      console.error(`Error sending message to ${chatId}:`, error.message);
      return false;
    }
  }

  /**
   * Format product added message with rich details
   */
  private formatProductAddedMessage(
    storeName: string,
    product: IkeaProduct
  ): { photo?: string; caption: string } {
    const emoji = '🆕';
    const priceEmoji = '💰';
    const discountEmoji = '🔥';
    const conditionEmoji = this.getConditionEmoji(product.condition);
    const linkEmoji = '🔗';

    // Calculate discount
    const discount = product.price.discount
      ? ` <b>(-${product.price.discount}%)</b>`
      : '';

    const originalPrice =
      product.price.original && product.price.original !== product.price.current
        ? `\n<s>€${product.price.original.toFixed(2)}</s> ➜ `
        : '';

    // Build caption
    let caption = `${emoji} <b>NUOVO PRODOTTO</b>\n`;
    caption += `📍 <i>${storeName}</i>\n\n`;
    caption += `<b>${product.name}</b>\n\n`;

    // Price section
    caption += `${priceEmoji} <b>Prezzo:</b> ${originalPrice}<b>€${product.price.current.toFixed(
      2
    )}</b>${discount}\n`;

    // Condition
    if (product.condition) {
      caption += `${conditionEmoji} <b>Condizioni:</b> ${this.translateCondition(
        product.condition
      )}\n`;
    }

    // Reason for discount
    if (product.reasonDiscount) {
      caption += `${discountEmoji} <b>Motivo sconto:</b> ${product.reasonDiscount}\n`;
    }

    // In box info
    if (product.isInBox !== undefined) {
      caption += `📦 <b>Scatola:</b> ${product.isInBox ? 'Sì' : 'No'}\n`;
    }

    // Additional info
    if (product.additionalInfo) {
      caption += `ℹ️ ${product.additionalInfo}\n`;
    }

    // Link
    if (product.url) {
      caption += `\n${linkEmoji} <a href="${product.url}">Vai al prodotto</a>`;
    }

    // Get first image
    const photo =
      product.images && product.images.length > 0
        ? product.images[0]
        : undefined;

    return { photo, caption };
  }

  /**
   * Format product removed message
   */
  private formatProductRemovedMessage(
    storeName: string,
    product: IkeaProduct
  ): { photo?: string; caption: string } {
    const emoji = '🔴';
    const priceEmoji = '💸';

    let caption = `${emoji} <b>PRODOTTO VENDUTO/RIMOSSO</b>\n`;
    caption += `📍 <i>${storeName}</i>\n\n`;
    caption += `<b>${product.name}</b>\n\n`;
    caption += `${priceEmoji} <b>Era:</b> €${product.price.current.toFixed(
      2
    )}\n`;

    if (product.condition) {
      caption += `🏷️ <b>Condizioni:</b> ${this.translateCondition(
        product.condition
      )}\n`;
    }

    const photo =
      product.images && product.images.length > 0
        ? product.images[0]
        : undefined;

    return { photo, caption };
  }

  /**
   * Format price change message
   */
  private formatPriceChangeMessage(
    storeName: string,
    product: IkeaProduct,
    oldPrice?: number
  ): { photo?: string; caption: string } {
    const emoji = '💰';
    const trendEmoji =
      oldPrice && product.price.current < oldPrice ? '📉' : '📈';
    const conditionEmoji = this.getConditionEmoji(product.condition);

    let caption = `${emoji} <b>CAMBIO PREZZO</b> ${trendEmoji}\n`;
    caption += `📍 <i>${storeName}</i>\n\n`;
    caption += `<b>${product.name}</b>\n\n`;

    // Price comparison
    if (oldPrice) {
      const difference = product.price.current - oldPrice;
      const percentChange = ((difference / oldPrice) * 100).toFixed(0);
      const changeEmoji = difference < 0 ? '🎉' : '⚠️';

      caption += `💵 <b>Prezzo:</b>\n`;
      caption += `   <s>€${oldPrice.toFixed(
        2
      )}</s> ➜ <b>€${product.price.current.toFixed(2)}</b>\n`;
      caption += `   ${changeEmoji} <b>${
        difference > 0 ? '+' : ''
      }€${difference.toFixed(2)}</b> (${percentChange}%)\n\n`;
    } else {
      caption += `💵 <b>Nuovo prezzo:</b> €${product.price.current.toFixed(
        2
      )}\n\n`;
    }

    // Condition
    if (product.condition) {
      caption += `${conditionEmoji} <b>Condizioni:</b> ${this.translateCondition(
        product.condition
      )}\n`;
    }

    // Link
    if (product.url) {
      caption += `\n🔗 <a href="${product.url}">Vai al prodotto</a>`;
    }

    const photo =
      product.images && product.images.length > 0
        ? product.images[0]
        : undefined;

    return { photo, caption };
  }

  /**
   * Get emoji for product condition
   */
  private getConditionEmoji(condition?: string): string {
    if (!condition) return '🏷️';

    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('nuovo') || conditionLower.includes('new'))
      return '✨';
    if (
      conditionLower.includes('ottim') ||
      conditionLower.includes('excellent')
    )
      return '⭐';
    if (conditionLower.includes('buon') || conditionLower.includes('good'))
      return '👍';
    if (conditionLower.includes('accettab') || conditionLower.includes('fair'))
      return '👌';

    return '🏷️';
  }

  /**
   * Translate condition to Italian
   */
  private translateCondition(condition: string): string {
    const translations: Record<string, string> = {
      new: 'Come nuovo',
      excellent: 'Ottime condizioni',
      good: 'Buone condizioni',
      fair: 'Condizioni accettabili',
      'as-is': "Venduto così com'è",
    };

    return translations[condition.toLowerCase()] || condition;
  }

  /**
   * Notify about new products added to a store
   */
  async notifyProductsAdded(
    storeId: string,
    storeName: string,
    products: IkeaProduct[]
  ): Promise<void> {
    if (!this.config.enabled) {
      console.log(
        `⚠️  Notifications disabled - skipping ${products.length} new products`
      );
      return;
    }

    if (products.length === 0) return;

    console.log(
      `\n📢 Preparing to notify about ${products.length} new product(s) in ${storeName}`
    );

    const subscribedUsers =
      await this.userService.getUsersSubscribedToStoreWithPreferences(storeId);

    console.log(
      `   👥 Found ${subscribedUsers.length} user(s) subscribed to store ${storeId}`
    );

    const usersWantingNotifications = subscribedUsers.filter(
      (u) => u.preferences.notifyOnNewProducts
    );

    console.log(
      `   ✅ ${usersWantingNotifications.length} user(s) have new product notifications enabled`
    );

    if (usersWantingNotifications.length === 0) {
      console.log(`   ⏭️  No users to notify`);
      return;
    }

    if (this.config.environment === 'development') {
      console.log(`\n🔧 DEVELOPMENT MODE - Preview (not sent):`);
      for (const product of products.slice(0, 2)) {
        const message = this.formatProductAddedMessage(storeName, product);
        console.log(
          `\n${message.caption}\n${
            message.photo ? `Photo: ${message.photo}` : 'No photo'
          }`
        );
      }
      if (products.length > 2) {
        console.log(`... and ${products.length - 2} more`);
      }
    } else {
      let successCount = 0;
      let failureCount = 0;

      for (const product of products) {
        const message = this.formatProductAddedMessage(storeName, product);

        for (const u of usersWantingNotifications) {
          try {
            let sent = false;
            if (message.photo) {
              sent = await this.sendPhotoMessage(
                u.chatId,
                message.photo,
                message.caption
              );
            } else {
              sent = await this.sendTextMessage(u.chatId, message.caption);
            }

            if (sent) successCount++;
            else failureCount++;

            // Small delay to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            failureCount++;
            console.error(`Failed to notify ${u.chatId}:`, error);
          }
        }
      }

      console.log(`   ✅ Sent ${successCount}, failed ${failureCount}`);
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

    console.log(
      `\n📢 Preparing to notify about ${products.length} removed product(s)`
    );

    const subscribedUsers =
      await this.userService.getUsersSubscribedToStoreWithPreferences(storeId);

    const usersWantingNotifications = subscribedUsers.filter(
      (u) => u.preferences.notifyOnRemovedProducts
    );

    console.log(
      `   ✅ ${usersWantingNotifications.length} user(s) want removed notifications`
    );

    if (usersWantingNotifications.length === 0) return;

    if (this.config.environment === 'development') {
      console.log(`\n🔧 DEVELOPMENT MODE - Preview:`);
      for (const product of products.slice(0, 2)) {
        const message = this.formatProductRemovedMessage(storeName, product);
        console.log(
          `\n${message.caption}\n${
            message.photo ? `Photo: ${message.photo}` : 'No photo'
          }`
        );
      }
    } else {
      let successCount = 0;

      for (const product of products) {
        const message = this.formatProductRemovedMessage(storeName, product);

        for (const u of usersWantingNotifications) {
          try {
            let sent = false;
            if (message.photo) {
              sent = await this.sendPhotoMessage(
                u.chatId,
                message.photo,
                message.caption
              );
            } else {
              sent = await this.sendTextMessage(u.chatId, message.caption);
            }

            if (sent) successCount++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to notify ${u.chatId}:`, error);
          }
        }
      }

      console.log(`   ✅ Sent ${successCount} notifications`);
    }
  }

  /**
   * Notify about price changes
   */
  async notifyPriceChanges(
    storeId: string,
    storeName: string,
    products: Array<IkeaProduct & { oldPrice?: number }>
  ): Promise<void> {
    if (!this.config.enabled || products.length === 0) return;

    console.log(
      `\n📢 Preparing to notify about ${products.length} price change(s)`
    );

    const subscribedUsers =
      await this.userService.getUsersSubscribedToStoreWithPreferences(storeId);

    const usersWantingNotifications = subscribedUsers.filter(
      (u) => u.preferences.notifyOnPriceChanges
    );

    console.log(
      `   ✅ ${usersWantingNotifications.length} user(s) want price notifications`
    );

    if (usersWantingNotifications.length === 0) return;

    if (this.config.environment === 'development') {
      console.log(`\n🔧 DEVELOPMENT MODE - Preview:`);
      for (const product of products.slice(0, 2)) {
        const message = this.formatPriceChangeMessage(
          storeName,
          product,
          product.oldPrice
        );
        console.log(
          `\n${message.caption}\n${
            message.photo ? `Photo: ${message.photo}` : 'No photo'
          }`
        );
      }
    } else {
      let successCount = 0;

      for (const product of products) {
        const message = this.formatPriceChangeMessage(
          storeName,
          product,
          product.oldPrice
        );

        for (const u of usersWantingNotifications) {
          try {
            let sent = false;
            if (message.photo) {
              sent = await this.sendPhotoMessage(
                u.chatId,
                message.photo,
                message.caption
              );
            } else {
              sent = await this.sendTextMessage(u.chatId, message.caption);
            }

            if (sent) successCount++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to notify ${u.chatId}:`, error);
          }
        }
      }

      console.log(`   ✅ Sent ${successCount} notifications`);
    }
  }

  /**
   * Notify about new stores (admin only - not sent to users)
   */
  async notifyStoresAdded(storeNames: string[]): Promise<void> {
    // Only log, don't send to users
    if (storeNames.length > 0) {
      console.log(`\nℹ️  New stores added (not notifying users):`);
      storeNames.forEach((name) => console.log(`   • ${name}`));
    }
  }

  /**
   * Notify about removed stores (admin only - not sent to users)
   */
  async notifyStoresRemoved(storeNames: string[]): Promise<void> {
    // Only log, don't send to users
    if (storeNames.length > 0) {
      console.log(`\nℹ️  Stores removed (not notifying users):`);
      storeNames.forEach((name) => console.log(`   • ${name}`));
    }
  }
}

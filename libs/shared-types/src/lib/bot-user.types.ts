/**
 * Bot User types for Firestore
 */

export interface BotUser {
  userId: string; // Telegram user ID
  chatId: string; // Telegram chat ID
  username?: string;
  firstName?: string;
  lastName?: string;
  botType: 'ikea-circularity'; // Type of bot
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotUserPreferences {
  userId: string;
  botType: 'ikea-circularity';
  preferences: IkeaCircularityPreferences;
  updatedAt: Date;
}

export interface IkeaCircularityPreferences {
  subscribedStores: string[]; // Array of store IDs
  notifyOnNewProducts: boolean;
  notifyOnRemovedProducts: boolean;
  notifyOnPriceChanges: boolean;
  maxPrice?: number; // Optional: only notify if price <= maxPrice
  minDiscount?: number; // Optional: only notify if discount >= minDiscount
}

export interface BotUserDocument extends BotUser {
  firestoreId?: string;
}

export interface BotUserPreferencesDocument extends BotUserPreferences {
  firestoreId?: string;
}

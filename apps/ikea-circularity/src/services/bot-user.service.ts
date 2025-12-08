import { FirestoreStorageAdapter } from '@data-scout/core-storage';
import {
  BotUserDocument,
  BotUserPreferencesDocument,
  IkeaCircularityPreferences,
} from '@data-scout/shared-types';

/**
 * Service to manage bot users and their preferences
 */
export class BotUserService {
  private usersAdapter: FirestoreStorageAdapter<BotUserDocument>;
  private preferencesAdapter: FirestoreStorageAdapter<BotUserPreferencesDocument>;

  constructor() {
    this.usersAdapter = new FirestoreStorageAdapter<BotUserDocument>(
      'bot_users'
    );
    this.preferencesAdapter =
      new FirestoreStorageAdapter<BotUserPreferencesDocument>(
        'bot_user_preferences'
      );
  }

  /**
   * Get or create a bot user
   */
  async getOrCreateUser(
    userId: string,
    chatId: string,
    botType: 'ikea-circularity',
    userData?: {
      username?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<BotUserDocument> {
    // Try to find existing user
    const existingUsers = await this.usersAdapter.query('userId', '==', userId);

    if (existingUsers.length > 0) {
      // Update existing user
      const user = existingUsers[0];
      const updatedUser: BotUserDocument = {
        ...user,
        chatId,
        username: userData?.username || user.username,
        firstName: userData?.firstName || user.firstName,
        lastName: userData?.lastName || user.lastName,
        isActive: true,
        updatedAt: new Date(),
      };
      await this.usersAdapter.save(updatedUser, userId);
      return updatedUser;
    }

    // Create new user
    const newUser: BotUserDocument = {
      userId,
      chatId,
      username: userData?.username,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      botType,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.usersAdapter.save(newUser, userId);
    return newUser;
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(
    userId: string,
    botType: 'ikea-circularity'
  ): Promise<BotUserPreferencesDocument | null> {
    const prefs = await this.preferencesAdapter.query('userId', '==', userId);
    const userPref = prefs.find((p) => p.botType === botType);
    return userPref || null;
  }

  /**
   * Initialize default preferences for a new user
   */
  async initializePreferences(
    userId: string,
    botType: 'ikea-circularity'
  ): Promise<BotUserPreferencesDocument> {
    const preferences: BotUserPreferencesDocument = {
      userId,
      botType,
      preferences: {
        subscribedStores: [],
        notifyOnNewProducts: true,
        notifyOnRemovedProducts: true,
        notifyOnPriceChanges: false,
      },
      updatedAt: new Date(),
    };

    await this.preferencesAdapter.save(preferences, `${userId}-${botType}`);
    return preferences;
  }

  /**
   * Subscribe user to a store
   */
  async subscribeToStore(
    userId: string,
    storeId: string
  ): Promise<BotUserPreferencesDocument> {
    let prefs = await this.getUserPreferences(userId, 'ikea-circularity');

    if (!prefs) {
      prefs = await this.initializePreferences(userId, 'ikea-circularity');
    }

    // Add store if not already subscribed
    if (!prefs.preferences.subscribedStores.includes(storeId)) {
      prefs.preferences.subscribedStores.push(storeId);
      prefs.updatedAt = new Date();
      await this.preferencesAdapter.save(prefs, `${userId}-ikea-circularity`);
    }

    return prefs;
  }

  /**
   * Unsubscribe user from a store
   */
  async unsubscribeFromStore(
    userId: string,
    storeId: string
  ): Promise<BotUserPreferencesDocument> {
    let prefs = await this.getUserPreferences(userId, 'ikea-circularity');

    if (!prefs) {
      prefs = await this.initializePreferences(userId, 'ikea-circularity');
      return prefs;
    }

    // Remove store
    prefs.preferences.subscribedStores =
      prefs.preferences.subscribedStores.filter((id) => id !== storeId);
    prefs.updatedAt = new Date();

    await this.preferencesAdapter.save(prefs, `${userId}-ikea-circularity`);
    return prefs;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<IkeaCircularityPreferences>
  ): Promise<BotUserPreferencesDocument> {
    let prefs = await this.getUserPreferences(userId, 'ikea-circularity');

    if (!prefs) {
      prefs = await this.initializePreferences(userId, 'ikea-circularity');
    }

    // Update preferences
    prefs.preferences = {
      ...prefs.preferences,
      ...updates,
    };
    prefs.updatedAt = new Date();

    await this.preferencesAdapter.save(prefs, `${userId}-ikea-circularity`);
    return prefs;
  }

  /**
   * Get all users subscribed to a specific store
   */
  async getUsersSubscribedToStore(storeId: string): Promise<string[]> {
    const allPrefs = await this.preferencesAdapter.getAll();
    const subscribedChatIds: string[] = [];

    for (const pref of allPrefs) {
      if (
        pref.botType === 'ikea-circularity' &&
        pref.preferences.subscribedStores.includes(storeId)
      ) {
        // Get user to get chatId
        const users = await this.usersAdapter.query(
          'userId',
          '==',
          pref.userId
        );
        if (users.length > 0 && users[0].isActive) {
          subscribedChatIds.push(users[0].chatId);
        }
      }
    }

    return subscribedChatIds;
  }

  /**
   * Deactivate user (when they block the bot)
   */
  async deactivateUser(userId: string): Promise<void> {
    const users = await this.usersAdapter.query('userId', '==', userId);
    if (users.length > 0) {
      const user = users[0];
      user.isActive = false;
      user.updatedAt = new Date();
      await this.usersAdapter.save(user, userId);
    }
  }

  /**
   * Get all active users for a bot type
   */
  async getActiveUsers(
    botType: 'ikea-circularity'
  ): Promise<BotUserDocument[]> {
    const allUsers = await this.usersAdapter.getAll();
    return allUsers.filter((u) => u.botType === botType && u.isActive);
  }
}

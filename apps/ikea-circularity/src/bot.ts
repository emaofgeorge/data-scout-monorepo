/**
 * Telegram Bot Launcher
 *
 * Starts the IKEA Circularity Telegram bot independently from the scraper
 * Handles user interactions and manages user preferences
 */

import 'dotenv/config';
import * as admin from 'firebase-admin';
import { IkeaTelegramBot } from './services/telegram-bot.service';
import { fetchIkeaStores } from './services/store-fetcher';

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase(): void {
  try {
    // Check if using Firebase Emulator
    const useEmulator =
      process.env.USE_FIREBASE_EMULATOR === 'true' ||
      process.env.NODE_ENV === 'development';

    if (useEmulator) {
      console.log('🔧 Using Firebase Emulator');
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

      const projectId =
        process.env.FIREBASE_PROJECT_ID || 'demo-ikea-circularity';

      admin.initializeApp({
        projectId: projectId,
      });

      console.log(`✓ Connected to Firebase Emulator (project: ${projectId})`);
    } else {
      // Production mode
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env
          .FIREBASE_SERVICE_ACCOUNT_PATH);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        throw new Error(
          'Missing Firebase configuration. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH'
        );
      }

      console.log('✓ Connected to Firebase');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Main bot launcher
 */
async function main(): Promise<void> {
  console.log('\n🤖 Starting IKEA Circularity Telegram Bot...\n');

  try {
    // Check for bot token
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN not found in environment variables.\n' +
          'Please set it in .env file or environment.'
      );
    }

    // Initialize Firebase
    initializeFirebase();

    // Fetch all available stores
    console.log('🏪 Fetching IKEA stores...\n');
    const stores = await fetchIkeaStores();
    console.log(`✓ Loaded ${stores.length} stores\n`);

    // Create bot instance
    const bot = new IkeaTelegramBot({
      token: process.env.TELEGRAM_BOT_TOKEN,
      availableStores: stores,
    });

    // Determine mode (polling for dev, webhook for prod)
    const isProduction = process.env.NODE_ENV === 'production';
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    if (isProduction && webhookUrl) {
      // Production mode with webhook
      console.log(`🌐 Starting bot with webhook: ${webhookUrl}`);
      await bot.setWebhook(webhookUrl);
      console.log('✓ Webhook set successfully');
      console.log('\n📡 Bot is running in webhook mode (production)');
      console.log('   Waiting for updates from Telegram...\n');

      // Keep process alive for webhook server
      // In production, this would typically be part of an Express/Fastify server
    } else {
      // Development mode with polling
      console.log('🔄 Starting bot in polling mode (development)');
      await bot.startPolling();
      console.log('✓ Bot is running and listening for updates\n');
      console.log('💬 Try these commands:');
      console.log('   /start - Register and get welcome message');
      console.log('   /stores - Select stores to subscribe to');
      console.log('   /mystores - View your subscriptions');
      console.log('   /preferences - Manage notification settings');
      console.log('   /help - Get help\n');
    }

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n\n👋 Shutting down bot...');
      await bot.stop();
      console.log('✓ Bot stopped gracefully\n');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('\n❌ Bot startup failed:', error);
    process.exit(1);
  }
}

// Run the bot
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

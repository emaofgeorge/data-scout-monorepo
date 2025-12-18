/**
 * Telegram Bot Launcher
 *
 * Starts the IKEA Circularity Telegram bot independently from the scraper
 * Handles user interactions and manages user preferences
 */

import 'dotenv/config';
import { initializeFirebase, initializeBot } from './bot-setup';

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
    await initializeFirebase();

    // Crea bot (se webhookUrl presente, lo setta)
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    const bot = await initializeBot({
      token: process.env.TELEGRAM_BOT_TOKEN!,
      webhookUrl,
    });

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && webhookUrl) {
      console.log(`🌐 Starting bot with webhook: ${webhookUrl}`);
      console.log('✓ Webhook set successfully');
      console.log('\n📡 Bot is running in webhook mode (production)');
      console.log('   Waiting for updates from Telegram...\n');
      // In produzione, il webhook server deve essere avviato separatamente (webhook.ts)
    } else {
      // Modalità polling
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

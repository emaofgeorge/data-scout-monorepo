/**
 * Telegram Bot Webhook Server
 *
 * Standalone Express server for handling Telegram webhooks in production
 * This should be deployed separately from the scraper
 */

import 'dotenv/config';
import express from 'express';
import { initializeFirebase, initializeBot } from './bot-setup';

const app = express();
app.use(express.json());

let bot: any = null;

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bot: bot ? 'initialized' : 'not initialized',
  });
});

/**
 * Telegram webhook endpoint
 * This is where Telegram sends all updates (messages, callbacks, etc.)
 */
app.post('/webhook', async (req, res) => {
  if (!bot) {
    console.error('Bot not initialized');
    res.status(503).json({ error: 'Bot not ready' });
    return;
  }

  try {
    const update = req.body;

    // Log update for debugging (remove in production)
    console.log('Received update:', JSON.stringify(update, null, 2));

    // Handle the update using Telegraf's built-in webhook handler
    await bot.handleWebhook(update);

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'IKEA Circularity Telegram Bot',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhook: '/webhook (POST)',
    },
  });
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  const port = process.env.PORT || 3000;

  try {
    console.log('\n🚀 Starting Telegram Bot Webhook Server...\n');

    // Initialize Firebase
    await initializeFirebase();

    // Initialize bot e set webhook
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_URL) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_URL sono richiesti'
      );
    }
    bot = await initializeBot({
      token: process.env.TELEGRAM_BOT_TOKEN,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    });
    console.log(`✓ Webhook configured: ${process.env.TELEGRAM_WEBHOOK_URL}`);

    // Start Express server
    app.listen(port, () => {
      console.log(`\n✓ Server running on port ${port}`);
      console.log(`📡 Webhook endpoint: http://localhost:${port}/webhook`);
      console.log(
        '\n⚠️  Make sure your webhook URL is publicly accessible and uses HTTPS!\n'
      );
    });
  } catch (error) {
    console.error('\n❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  if (bot) {
    bot.stop().then(() => {
      console.log('✓ Bot stopped');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  if (bot) {
    bot.stop().then(() => {
      console.log('✓ Bot stopped');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start the server
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

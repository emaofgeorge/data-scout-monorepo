import 'dotenv/config';
import express from 'express';
import { initializeFirebase, initializeBot } from './bot-setup';

const app = express();
app.use(express.json());

let bot: any = null;
let ready = false;

// Health endpoint: risponde subito
app.get('/health', (req, res) => {
  res.json({
    status: ready ? 'ok' : 'starting',
    timestamp: new Date().toISOString(),
    bot: bot ? 'initialized' : 'not initialized',
    port: process.env.PORT,
    nodeVersion: process.version,
  });
});

// Webhook endpoint: 503 finché il bot non è pronto
app.post('/webhook', async (req, res) => {
  if (!bot) {
    res.status(503).json({ error: 'Bot not ready' });
    return;
  }
  try {
    await bot.handleWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.json({ service: 'IKEA Circularity Telegram Bot', version: '1.0.0' });
});

async function init() {
  try {
    console.log('🔥 Initializing Firebase...');
    await initializeFirebase();
    console.log('✅ Firebase initialized');

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_URL) {
      throw new Error(
        'Env TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_URL richieste'
      );
    }

    console.log('🤖 Initializing bot...');
    bot = await initializeBot({
      token: process.env.TELEGRAM_BOT_TOKEN,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    });
    console.log(
      `✅ Bot initialized with webhook: ${process.env.TELEGRAM_WEBHOOK_URL}`
    );

    ready = true;
  } catch (err) {
    console.error('❌ Initialization failed:', err);
    // Non uscire subito: il server rimane su, health = starting, per debug.
    // Se preferisci uscire, usa process.exit(1) e sappi che Render non vedrà la porta.
  }
}

const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${port} (0.0.0.0)`);
  // Avvia le inizializzazioni in background
  init().catch((err) => console.error('Fatal init error:', err));
});

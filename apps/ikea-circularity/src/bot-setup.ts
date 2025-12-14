import * as admin from 'firebase-admin';
import { IkeaTelegramBot } from './services/telegram-bot.service';
import { fetchIkeaStores } from './services/store-fetcher';

export async function initializeFirebase(): Promise<void> {
  if (admin.apps.length > 0) {
    console.log('✓ Firebase already initialized');
    return;
  }

  try {
    const useEmulator =
      process.env.USE_FIREBASE_EMULATOR === 'true' ||
      process.env.NODE_ENV === 'development';

    if (useEmulator) {
      console.log('🔧 Using Firebase Emulator');
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
      const projectId =
        process.env.FIREBASE_PROJECT_ID || 'demo-ikea-circularity';
      admin.initializeApp({ projectId });
      console.log(`✓ Connected to Firebase Emulator (project: ${projectId})`);
      return;
    }

    // Production mode
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    } else {
      throw new Error(
        'Missing Firebase configuration. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH'
      );
    }

    console.log('✓ Connected to Firebase');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

export async function initializeBot(options: {
  token: string;
  webhookUrl?: string;
}): Promise<IkeaTelegramBot> {
  const stores = await fetchIkeaStores();
  const bot = new IkeaTelegramBot({
    token: options.token,
    availableStores: stores,
    webhookUrl: options.webhookUrl,
  });
  if (options.webhookUrl) {
    await bot.setWebhook(options.webhookUrl);
  }
  return bot;
}

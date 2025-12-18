import * as admin from 'firebase-admin';
import path from 'path';

/**
 * Initialize Firebase Admin SDK
 * Used by both scraper and bot applications
 */
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
      const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const serviceAccountPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(process.cwd(), rawPath);

      try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Failed to load Firebase service account from ${serviceAccountPath}: ${errMsg}`
        );
      }
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

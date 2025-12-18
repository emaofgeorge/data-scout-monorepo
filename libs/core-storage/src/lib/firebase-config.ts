import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK with support for:
 * - Local emulator
 * - Service account JSON file
 * - Service account JSON string (for cloud environments)
 * - Google Cloud default credentials
 */
export async function initializeFirebase(): Promise<void> {
  if (admin.apps.length > 0) {
    console.log('✓ Firebase already initialized');
    return;
  }

  try {
    // Check if using emulator
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

    // Production mode - Try different credential sources
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : null;

    if (serviceAccount) {
      // Initialize with explicit credentials
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✓ Firebase initialized with service account');
    } else {
      // Try Google Cloud default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log(
        '✓ Firebase initialized with application default credentials'
      );
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * IKEA Circularity Scraper Application
 *
 * Monitors IKEA's second-hand circularity products across Italian stores
 * Syncs data to Firestore and handles product lifecycle (add/update/remove)
 */

// Set Firestore emulator BEFORE loading anything else
if (
  process.env.USE_FIREBASE_EMULATOR === 'true' ||
  process.env.NODE_ENV === 'development'
) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

// Load environment variables from .env file
import 'dotenv/config';

import * as admin from 'firebase-admin';
import { IkeaCircularityScraper } from './scraper/ikea-scraper';
import { IkeaSyncService } from './services/sync.service';
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
      // Initialize with demo project for emulator
      console.log('🔧 Using Firebase Emulator');

      // Set environment variables for Firestore emulator BEFORE initialization
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
      console.log(
        `🔍 FIRESTORE_EMULATOR_HOST set to: ${process.env.FIRESTORE_EMULATOR_HOST}`
      );

      // Use project ID from env or default demo project for emulator
      const projectId =
        process.env.FIREBASE_PROJECT_ID || 'demo-ikea-circularity';

      admin.initializeApp({
        projectId: projectId,
      });

      console.log(`✓ Connected to Firebase Emulator (project: ${projectId})`);
    } else {
      // Production mode - require credentials
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env
          .FIREBASE_SERVICE_ACCOUNT_PATH);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else if (process.env.FIREBASE_PROJECT_ID) {
        // Use Application Default Credentials (for Cloud environments)
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        throw new Error(
          'Firebase configuration missing. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH, or set USE_FIREBASE_EMULATOR=true'
        );
      }

      console.log('✓ Firebase initialized successfully');
    }
  } catch (error) {
    console.error('✗ Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Main application logic
 */
async function main() {
  console.log('🚀 IKEA Circularity Scraper - Starting...\n');

  try {
    // Initialize Firebase
    initializeFirebase();

    // Fetch all IKEA stores dynamically
    console.log('\n🏪 Fetching IKEA stores...\n');
    const allStores = await fetchIkeaStores();

    console.log(`✓ Discovered ${allStores.length} stores:`);
    allStores.forEach((store) => {
      console.log(`  - ${store.name} (${store.city}) - ID: ${store.id}`);
    });

    // Sync all stores to Firestore and detect changes
    const syncService = new IkeaSyncService();
    const storesSyncResult = await syncService.syncAllStores(allStores);

    // Filter by specific store ID if provided
    let stores = allStores;
    const filterStoreId = process.env.STORE_ID;
    if (filterStoreId) {
      const filteredStore = stores.find((s) => s.id === filterStoreId);
      if (filteredStore) {
        console.log(
          `\n🎯 Filtering for single store: ${filteredStore.name} (ID: ${filterStoreId})\n`
        );
        stores = [filteredStore];
      } else {
        console.error(`\n❌ Store ID '${filterStoreId}' not found!\n`);
        console.log('Available store IDs:');
        allStores.forEach((s) => console.log(`  - ${s.id}: ${s.name}`));
        process.exit(1);
      }
    }

    // Create scraper (with integrated sync service)
    const scraper = new IkeaCircularityScraper({
      name: 'ikea-circularity',
      url: 'https://www.ikea.com/it/it/circular/second-hand/',
      stores: stores,
    });

    // Initialize scraper
    await scraper.initialize();

    // Execute scraping (now syncs to Firestore in real-time)
    console.log('\n📡 Starting scrape...\n');
    const results = await scraper.scrape();

    // Get final statistics
    const stats = await syncService.getSyncStats();

    // Cleanup
    await scraper.cleanup();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`
📊 Scraping Results:
   • Stores processed: ${results.stores.length}
   • Categories found: ${results.totalCategories}
   • Products scraped: ${results.totalProducts}

🏪 Store Changes:
   • New stores added: ${storesSyncResult.added}
   • Stores removed: ${storesSyncResult.removed}

🔄 Sync Statistics:
   • New products added: ${results.syncStats.totalAdded}
   • Products updated: ${results.syncStats.totalUpdated}
   • Products removed: ${results.syncStats.totalRemoved}

📈 Database Totals:
   • Total stores: ${stats.totalStores}
   • Total categories: ${stats.totalCategories}
   • Total products: ${stats.totalProducts}
   • Available products: ${stats.availableProducts}
    `);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Application error:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run the application
main();

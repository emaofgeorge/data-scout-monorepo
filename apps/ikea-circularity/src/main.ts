/**
 * IKEA Circularity Scraper Application
 *
 * Monitors IKEA's second-hand circularity products across Italian stores
 * Syncs data to Firestore and handles product lifecycle (add/update/remove)
 */
import 'dotenv/config';
import { initializeFirebase } from './bot-setup';
import { IkeaCircularityScraper } from './scraper/ikea-scraper';
import { IkeaSyncService } from './services/sync.service';
import { NotificationService } from './services/notification.service';
import { fetchIkeaStores } from './services/store-fetcher';

async function main() {
  console.log('🚀 IKEA Circularity Scraper - Starting...\n');

  try {
    // Initialize Firebase
    initializeFirebase();

    // ========================================
    // STEP 1: Fetch stores from Contentful
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📋 STEP 1: Fetching stores configuration');
    console.log('='.repeat(60));

    const stores = await fetchIkeaStores();

    console.log(
      `\n✅ Configuration loaded: ${stores.length} store(s) to process`
    );
    stores.forEach((store) => {
      console.log(`   • ${store.name} (${store.city}) - ID: ${store.id}`);
    });

    // ========================================
    // STEP 2: Sync stores to Firestore
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🔄 STEP 2: Syncing active stores to Firestore');
    console.log('='.repeat(60));

    const syncService = new IkeaSyncService();
    const storesSyncResult = await syncService.syncAllStores(stores);

    // ========================================
    // STEP 3: Initialize notification service
    // ========================================
    const notificationService = new NotificationService({
      enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
      environment:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
      telegram: process.env.TELEGRAM_BOT_TOKEN
        ? {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
          }
        : undefined,
    });

    // ========================================
    // STEP 4: Create scraper and execute
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🔍 STEP 3: Starting product scraping');
    console.log('='.repeat(60));

    const scraper = new IkeaCircularityScraper({
      name: 'ikea-circularity',
      url: 'https://www.ikea.com/it/it/circular/second-hand/',
      stores: stores,
      notificationService: notificationService,
    });

    // Initialize scraper
    await scraper.initialize();

    // Execute scraping (syncs to Firestore in real-time)
    const results = await scraper.scrape();

    // Get final statistics
    const stats = await syncService.getSyncStats();

    // Cleanup
    await scraper.cleanup();

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`
📊 Scraping Results:
   • Stores processed: ${results.stores.length}
   • Categories found: ${results.totalCategories}
   • Products scraped: ${results.totalProducts}

🏪 Store Management:
   • New stores added: ${storesSyncResult.added}
   • Stores updated: ${storesSyncResult.updated}
   • Stores skipped (inactive): ${storesSyncResult.skipped}

🔄 Product Changes:
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

import * as cheerio from 'cheerio';
import { BrowserHttpClient } from '@data-scout/core-scraper';
import { IkeaStore } from '@data-scout/shared-types';
import {
  fetchStoresFromContentful,
  validateContentfulStoresAgainstIkea,
} from './contentful';

interface IkeaStoreRaw {
  store_id: string;
  name: string;
  city?: string;
  address?: string;
  [key: string]: unknown;
}

/**
 * Scrape all IKEA stores from the circular page
 * This is used for validation or fallback
 */
async function scrapeIkeaStoresFromWebsite(): Promise<IkeaStore[]> {
  try {
    const url = 'https://www.ikea.com/it/it/circular/second-hand/';
    console.log('🔍 Scraping IKEA stores from website:', url);

    const httpClient = new BrowserHttpClient();
    const html = await httpClient.get<string>(url);

    const $ = cheerio.load(html);
    const nextDataScript = $('#__NEXT_DATA__').html();

    if (!nextDataScript) {
      throw new Error('Could not find __NEXT_DATA__ in page');
    }

    const nextData = JSON.parse(nextDataScript);
    const stores = nextData?.props?.pageProps?.stores;

    if (!stores || !Array.isArray(stores)) {
      throw new Error('Stores data not found in expected format');
    }

    console.log(`✅ Scraped ${stores.length} stores from IKEA website`);

    return stores.map((store: IkeaStoreRaw) => ({
      id: store.store_id.toString(),
      name: store.name,
      city: store.city || '',
      region: extractRegion(store.city || store.name),
      country: 'IT',
    }));
  } catch (error) {
    console.error('❌ Error scraping IKEA stores from website:', error);
    throw error;
  }
}

/**
 * Main function to fetch IKEA stores
 *
 * Flow:
 * 1. Try to fetch from Contentful (if configured)
 * 2. Scrape all stores from IKEA website
 * 3. Validate Contentful stores against IKEA
 * 4. Show which stores are available but not active
 * 5. Return only active stores for scraping
 */
export async function fetchIkeaStores(): Promise<IkeaStore[]> {
  const useContentful =
    process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_CDA_TOKEN;

  // If Contentful not configured, fallback to full scrape
  if (!useContentful) {
    console.log(
      '⚠️  Contentful not configured - using all stores from IKEA website\n' +
        '   To use Contentful, set CONTENTFUL_SPACE_ID and CONTENTFUL_CDA_TOKEN'
    );
    return await scrapeIkeaStoresFromWebsite();
  }

  try {
    // Step 1: Fetch enabled stores from Contentful
    const contentfulStores = await fetchStoresFromContentful();

    // Step 2: Scrape all stores from IKEA website (for validation)
    console.log('\n🌐 Fetching all IKEA stores for validation...');
    const allIkeaStores = await scrapeIkeaStoresFromWebsite();

    // Step 3: Validate Contentful stores against IKEA
    const { validStores, invalidStores } =
      await validateContentfulStoresAgainstIkea(
        contentfulStores,
        allIkeaStores
      );

    // Step 4: Fail if any invalid stores found
    if (invalidStores.length > 0) {
      const invalidList = invalidStores
        .map((s) => `  • ${s.name} (ID: ${s.id})`)
        .join('\n');

      const availableIds = allIkeaStores
        .map((s) => `${s.id} (${s.name})`)
        .join('\n  ');

      throw new Error(
        `❌ VALIDATION FAILED: ${invalidStores.length} store(s) from Contentful not found on IKEA:\n\n` +
          `${invalidList}\n\n` +
          `Please update Contentful to remove invalid stores or fix their IDs.\n\n` +
          `Available IKEA store IDs:\n  ${availableIds}`
      );
    }

    // Step 5: Fail if no valid stores
    if (validStores.length === 0) {
      throw new Error(
        '❌ No valid stores found after validation\n' +
          '   Please add at least one valid store in Contentful.'
      );
    }

    // Step 6: Show stores available on IKEA but not active in Contentful
    const activeStoreIds = new Set(validStores.map((s) => s.id));
    const inactiveStores = allIkeaStores.filter(
      (s) => !activeStoreIds.has(s.id)
    );

    if (inactiveStores.length > 0) {
      console.log(
        `\n📋 Stores available on IKEA but NOT active in Contentful (${inactiveStores.length}):`
      );
      inactiveStores.forEach((store) => {
        console.log(`   ⏭️  ${store.name} (${store.city}) - ID: ${store.id}`);
      });
      console.log(
        `\n   💡 To activate these stores, add them to Contentful with enabled=true`
      );
    }

    console.log(
      `\n✅ Validation successful: ${validStores.length} active store(s) ready for scraping\n`
    );

    return validStores;
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ STORE FETCH FAILED');
      console.error('='.repeat(60));
      console.error(error.message);
      console.error('='.repeat(60) + '\n');
    }
    throw error;
  }
}

/**
 * Try to extract region from city name (best effort)
 */
function extractRegion(cityOrName: string): string {
  const regionMap: Record<string, string> = {
    milano: 'Lombardia',
    'san giuliano': 'Lombardia',
    corsico: 'Lombardia',
    carugate: 'Lombardia',
    roncadelle: 'Lombardia',
    brescia: 'Lombardia',
    roma: 'Lazio',
    anagnina: 'Lazio',
    bologna: 'Emilia-Romagna',
    casalecchio: 'Emilia-Romagna',
    parma: 'Emilia-Romagna',
    padova: 'Veneto',
    torino: 'Piemonte',
    bari: 'Puglia',
    genova: 'Liguria',
    napoli: 'Campania',
    pisa: 'Toscana',
    firenze: 'Toscana',
    catania: 'Sicilia',
  };

  const normalized = cityOrName.toLowerCase();
  for (const [key, region] of Object.entries(regionMap)) {
    if (normalized.includes(key)) {
      return region;
    }
  }

  return 'Unknown';
}

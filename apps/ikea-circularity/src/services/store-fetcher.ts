import * as cheerio from 'cheerio';
import { BrowserHttpClient } from '@data-scout/core-scraper';
import { IkeaStore } from '@data-scout/shared-types';

interface IkeaStoreRaw {
  store_id: string;
  name: string;
  city?: string;
  address?: string;
  [key: string]: unknown;
}

/**
 * Fetch all IKEA stores from the circular page
 * Extracts store data from __NEXT_DATA__ script tag
 */
export async function fetchIkeaStores(): Promise<IkeaStore[]> {
  try {
    const url = 'https://www.ikea.com/it/it/circular/second-hand/';
    console.log('🔍 Fetching IKEA stores from:', url);

    const httpClient = new BrowserHttpClient();
    const html = await httpClient.get<string>(url);

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Find the __NEXT_DATA__ script tag
    const nextDataScript = $('#__NEXT_DATA__').html();

    if (!nextDataScript) {
      throw new Error('Could not find __NEXT_DATA__ in page');
    }

    // Parse JSON
    const nextData = JSON.parse(nextDataScript);

    // Extract stores from props.pageProps.stores
    const stores = nextData?.props?.pageProps?.stores;

    if (!stores || !Array.isArray(stores)) {
      throw new Error('Stores data not found in expected format');
    }

    console.log(`✓ Found ${stores.length} stores in page data`);

    // Map to our IkeaStore format
    return stores.map((store: IkeaStoreRaw) => ({
      id: store.store_id.toString(),
      name: store.name,
      city: store.city || '',
      region: extractRegion(store.city || store.name),
      country: 'IT',
    }));
  } catch (error) {
    console.error('Error fetching IKEA stores:', error);
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

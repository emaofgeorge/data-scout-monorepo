import axios from 'axios';
import { IkeaStore } from '@data-scout/shared-types';

interface ContentfulStoreItem {
  storeName: string;
  ikeaStoreId: string;
  region: string;
  enabled: boolean;
}

interface ContentfulResponse {
  data: {
    ikeaCircularHubStoreCollection: {
      items: ContentfulStoreItem[];
    };
  };
}

/**
 * Fetch enabled IKEA stores from Contentful GraphQL Delivery API
 *
 * Required environment variables:
 * - CONTENTFUL_SPACE_ID
 * - CONTENTFUL_CDA_TOKEN
 * - CONTENTFUL_ENVIRONMENT (optional, default: 'master')
 */
export async function fetchStoresFromContentful(): Promise<IkeaStore[]> {
  const spaceId = process.env.CONTENTFUL_SPACE_ID;
  const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master';
  const token = process.env.CONTENTFUL_CDA_TOKEN;

  // Validate configuration
  if (!spaceId || !token) {
    const missing: string[] = [];
    if (!spaceId) missing.push('CONTENTFUL_SPACE_ID');
    if (!token) missing.push('CONTENTFUL_CDA_TOKEN');

    throw new Error(
      `❌ Missing required Contentful configuration: ${missing.join(', ')}\n` +
        `   Please set these environment variables in your .env file.`
    );
  }

  const url = `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/${environment}`;

  const query = `
    query GetEnabledStores {
      ikeaCircularHubStoreCollection(where: {enabled: true}, limit: 1000) {
        items {
          storeName
          ikeaStoreId
          region
          enabled
        }
      }
    }
  `;

  try {
    console.log('📡 Fetching enabled stores from Contentful...');
    console.log(`   Space: ${spaceId}`);
    console.log(`   Environment: ${environment}`);

    const response = await axios.post<ContentfulResponse>(
      url,
      { query },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const items =
      response.data?.data?.ikeaCircularHubStoreCollection?.items || [];

    if (items.length === 0) {
      throw new Error(
        '❌ No enabled stores found in Contentful\n' +
          '   Please add at least one store with enabled=true in Contentful.'
      );
    }

    // Map to IkeaStore format
    const stores: IkeaStore[] = items
      .filter(
        (item) => item && item.enabled && item.ikeaStoreId && item.storeName
      )
      .map((item) => ({
        id: item.ikeaStoreId.toString().trim(),
        name: item.storeName.trim(),
        city: '', // Will be filled from IKEA validation
        region: item.region?.trim() || '',
        country: 'IT',
      }));

    if (stores.length === 0) {
      throw new Error(
        '❌ No valid stores found in Contentful after filtering\n' +
          '   Ensure stores have: enabled=true, ikeaStoreId, and storeName fields.'
      );
    }

    console.log(`✅ Contentful: found ${stores.length} enabled store(s):`);
    stores.forEach((store) => {
      console.log(
        `   • ${store.name} (ID: ${store.id}) - ${store.region || 'No region'}`
      );
    });

    return stores;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message =
        error.response?.data?.errors?.[0]?.message || error.message;

      throw new Error(
        `❌ Contentful API error (${status || 'network'}): ${message}\n` +
          `   Check your CONTENTFUL_SPACE_ID, CONTENTFUL_CDA_TOKEN, and network connection.`
      );
    }

    throw error;
  }
}

/**
 * Validate that Contentful stores exist in IKEA's actual store list
 * Returns validated stores with enriched data (city) from IKEA
 */
export async function validateContentfulStoresAgainstIkea(
  contentfulStores: IkeaStore[],
  ikeaStores: IkeaStore[]
): Promise<{
  validStores: IkeaStore[];
  invalidStores: IkeaStore[];
}> {
  console.log('\n🔍 Validating Contentful stores against IKEA...');

  const ikeaStoresMap = new Map(ikeaStores.map((s) => [s.id, s]));
  const validStores: IkeaStore[] = [];
  const invalidStores: IkeaStore[] = [];

  for (const contentfulStore of contentfulStores) {
    const ikeaStore = ikeaStoresMap.get(contentfulStore.id);

    if (ikeaStore) {
      // Store exists on IKEA - enrich with IKEA data
      validStores.push({
        ...contentfulStore,
        city: ikeaStore.city, // Use IKEA's city data
        name: ikeaStore.name, // Use IKEA's official name
      });
      console.log(
        `   ✅ ${contentfulStore.name} (ID: ${contentfulStore.id}) - Valid`
      );
    } else {
      invalidStores.push(contentfulStore);
      console.log(
        `   ❌ ${contentfulStore.name} (ID: ${contentfulStore.id}) - NOT FOUND on IKEA`
      );
    }
  }

  return { validStores, invalidStores };
}

import { BaseScraper } from '@data-scout/core-scraper';
import { BrowserHttpClient } from '@data-scout/core-scraper';
import {
  IkeaStore,
  IkeaCategory,
  IkeaProduct,
  IkeaCategoriesResponse,
  IkeaProductsSearchResponse,
} from '@data-scout/shared-types';
import { IkeaSyncService } from '../services/sync.service';

export interface IkeaScraperConfig {
  name: string;
  url: string;
  stores: IkeaStore[];
}

export interface IkeaScraperResult {
  stores: Array<{
    store: IkeaStore;
    categories: IkeaCategory[];
    products: IkeaProduct[];
  }>;
  totalProducts: number;
  totalCategories: number;
  syncStats: {
    totalAdded: number;
    totalUpdated: number;
    totalRemoved: number;
  };
}

/**
 * IKEA Circularity Scraper
 * Scrapes second-hand products from IKEA circular stores
 */
export class IkeaCircularityScraper extends BaseScraper<IkeaScraperResult> {
  private httpClient: BrowserHttpClient;
  private syncService: IkeaSyncService;
  private readonly CATEGORIES_URL =
    'https://web-api.ikea.com/circular/circular-asis/api/public/categories';
  private readonly PRODUCTS_URL =
    'https://web-api.ikea.com/circular/circular-asis/offers/grouped/search';
  private readonly PAGE_SIZE = 32;

  /**
   * Generate store slug from store name for URL
   * Example: "IKEA Milano Corsico" -> "milano-corsico"
   */
  private generateStoreSlug(storeName: string): string {
    return storeName
      .toLowerCase()
      .replace(/^ikea\s+/i, '') // Remove "IKEA" prefix
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  }

  constructor(config: IkeaScraperConfig) {
    super(config);
    this.httpClient = new BrowserHttpClient();
    this.syncService = new IkeaSyncService();
  }

  override async initialize(): Promise<void> {
    await super.initialize();
    console.log(
      `Initializing IKEA Circularity Scraper for ${
        (this.config as IkeaScraperConfig).stores.length
      } stores`
    );
  }

  /**
   * Main scraping logic
   */
  async scrape(): Promise<IkeaScraperResult> {
    const config = this.config as IkeaScraperConfig;
    const results: IkeaScraperResult = {
      stores: [],
      totalProducts: 0,
      totalCategories: 0,
      syncStats: {
        totalAdded: 0,
        totalUpdated: 0,
        totalRemoved: 0,
      },
    };

    console.log(`Starting scrape for ${config.stores.length} stores...`);

    for (const store of config.stores) {
      try {
        console.log(`\n📍 Processing store: ${store.name} (${store.id})`);

        // Fetch categories for this store
        const categories = await this.fetchCategories(store);
        console.log(`  ✓ Found ${categories.length} categories`);

        // Fetch all products for this store
        const products = await this.fetchAllProducts(store);
        console.log(`  ✓ Found ${products.length} products`);

        // Sync to Firestore
        await this.syncService.syncStore(
          store,
          products.length,
          categories.length
        );

        await this.syncService.syncCategories(store.id, categories);

        const syncStats = await this.syncService.syncProducts(
          store.id,
          products
        );

        // Accumulate sync statistics
        results.syncStats.totalAdded += syncStats.added;
        results.syncStats.totalUpdated += syncStats.updated;
        results.syncStats.totalRemoved += syncStats.removed;

        results.stores.push({
          store,
          categories,
          products,
        });

        results.totalCategories += categories.length;
        results.totalProducts += products.length;
      } catch (error) {
        console.error(`  ✗ Error processing store ${store.name}:`, error);
        // Continue with next store even if one fails
      }
    }

    console.log(
      `\n✅ Scraping complete: ${results.totalProducts} products from ${results.stores.length} stores`
    );
    return results;
  }

  /**
   * Fetch categories for a specific store
   */
  private async fetchCategories(store: IkeaStore): Promise<IkeaCategory[]> {
    try {
      const url = `${this.CATEGORIES_URL}/it/it/${store.id}`;
      const response = await this.httpClient.get<IkeaCategoriesResponse>(url);

      if (!response || !Array.isArray(response)) {
        return [];
      }

      return response.map((cat) => ({
        id: cat.id.toString(),
        name: cat.name,
        description: cat.category_code,
        imageUrl: undefined,
        productCount: undefined,
      }));
    } catch (error) {
      console.error(`Error fetching categories for store ${store.id}:`, error);
      return [];
    }
  }

  /**
   * Fetch all products for a specific store (paginated)
   */
  private async fetchAllProducts(store: IkeaStore): Promise<IkeaProduct[]> {
    const allProducts: IkeaProduct[] = [];
    let currentPage = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const products = await this.fetchProductsPage(store, currentPage);

        if (products.length === 0) {
          hasMorePages = false;
        } else {
          allProducts.push(...products);
          currentPage++;

          // Check if we got less than page size (last page)
          if (products.length < this.PAGE_SIZE) {
            hasMorePages = false;
          }
        }
      } catch (error) {
        console.error(
          `Error fetching page ${currentPage} for store ${store.id}:`,
          error
        );
        hasMorePages = false;
      }
    }

    return allProducts;
  }

  /**
   * Fetch a single page of products
   */
  private async fetchProductsPage(
    store: IkeaStore,
    page: number
  ): Promise<IkeaProduct[]> {
    try {
      const url = `${this.PRODUCTS_URL}?languageCode=it&size=${this.PAGE_SIZE}&storeIds=${store.id}&page=${page}`;
      const response = await this.httpClient.get<IkeaProductsSearchResponse>(
        url
      );

      if (!response || !response.content) {
        return [];
      }

      const now = new Date();

      const storeSlug = this.generateStoreSlug(store.name);

      return response.content
        .filter((item) => {
          // Skip items with missing required fields
          if (
            !item ||
            !item.offers ||
            item.offers.length === 0 ||
            !item.title
          ) {
            console.warn(`⚠ Skipping invalid item in store ${store.id}`);
            return false;
          }
          return true;
        })
        .flatMap((item) =>
          // Create one product per offer
          item.offers.map((offer) => ({
            id: `${store.id}-${offer.offerUuid}`,
            offerId: offer.offerUuid,
            articleNumbers: item.articleNumbers || [],
            name: item.title,
            description: item.description || offer.description || '',
            price: {
              current: offer.price,
              original: item.originalPrice,
              currency: item.currency,
              discount:
                item.originalPrice && offer.price
                  ? Math.round(
                      ((item.originalPrice - offer.price) /
                        item.originalPrice) *
                        100
                    )
                  : undefined,
            },
            condition: offer.productConditionCode,
            category: undefined,
            categoryId: undefined,
            images:
              item.media?.map((img) => img.url) ||
              (item.heroImage ? [item.heroImage] : []),
            storeId: store.id,
            storeName: store.name,
            availability: 'available' as const,
            url: `https://www.ikea.com/it/it/circular/second-hand/#/${storeSlug}/${offer.id}`,
            isInBox: offer.isInBox,
            reasonDiscount: offer.reasonDiscount || '',
            additionalInfo: offer.additionalInfo || '',
            lastSeen: now,
            firstSeen: now, // Will be updated during sync
          }))
        );
    } catch (error) {
      console.error(
        `Error fetching products page ${page} for store ${store.id}:`,
        error
      );
      return [];
    }
  }

  override async cleanup(): Promise<void> {
    await super.cleanup();
    console.log('IKEA Circularity Scraper cleanup complete');
  }
}

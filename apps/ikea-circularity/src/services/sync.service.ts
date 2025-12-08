import { FirestoreStorageAdapter } from '@data-scout/core-storage';
import {
  IkeaStore,
  IkeaCategory,
  IkeaProduct,
  IkeaStoreDocument,
  IkeaCategoryDocument,
  IkeaProductDocument,
} from '@data-scout/shared-types';

/**
 * Service to synchronize IKEA data with Firestore
 * Handles create, update, and delete operations
 */
export class IkeaSyncService {
  private storesAdapter: FirestoreStorageAdapter<IkeaStoreDocument>;
  private categoriesAdapter: FirestoreStorageAdapter<IkeaCategoryDocument>;
  private productsAdapter: FirestoreStorageAdapter<IkeaProductDocument>;

  constructor() {
    this.storesAdapter = new FirestoreStorageAdapter<IkeaStoreDocument>(
      'ikea_stores'
    );
    this.categoriesAdapter = new FirestoreStorageAdapter<IkeaCategoryDocument>(
      'ikea_categories'
    );
    this.productsAdapter = new FirestoreStorageAdapter<IkeaProductDocument>(
      'ikea_products'
    );
  }

  /**
   * Sync all stores from IKEA website
   * Detects new stores added or stores removed
   */
  async syncAllStores(allStores: IkeaStore[]): Promise<{
    added: number;
    updated: number;
    removed: number;
    newStores: IkeaStore[];
    removedStores: IkeaStoreDocument[];
  }> {
    console.log('\n🏪 Syncing all IKEA stores...');

    let added = 0;
    let updated = 0;
    let removed = 0;
    const newStores: IkeaStore[] = [];
    const removedStores: IkeaStoreDocument[] = [];

    // Get existing stores from Firestore
    const existingStores = await this.storesAdapter.getAll();
    const existingStoresMap = new Map<string, IkeaStoreDocument>();
    existingStores.forEach((s: IkeaStoreDocument) => {
      existingStoresMap.set(s.id, s);
    });

    // Create set of new store IDs
    const newStoreIds = new Set(allStores.map((s) => s.id));

    // Process all stores (add or update)
    for (const store of allStores) {
      const existingStore = existingStoresMap.get(store.id);

      if (existingStore) {
        // Update existing store (just update lastSync and name if changed)
        if (existingStore.name !== store.name) {
          const storeDoc: IkeaStoreDocument = {
            id: store.id,
            name: store.name,
            city: store.city || '',
            region: store.region || '',
            country: store.country,
            lastSync: new Date(),
            productsCount: existingStore.productsCount || 0,
            categoriesCount: existingStore.categoriesCount || 0,
          };
          await this.storesAdapter.save(storeDoc, store.id);
          updated++;
        }
      } else {
        // New store added!
        const storeDoc: IkeaStoreDocument = {
          id: store.id,
          name: store.name,
          city: store.city || '',
          region: store.region || '',
          country: store.country,
          lastSync: new Date(),
          productsCount: 0,
          categoriesCount: 0,
        };
        await this.storesAdapter.save(storeDoc, store.id);
        added++;
        newStores.push(store);
        console.log(`  🆕 NEW STORE DETECTED: ${store.name} (${store.city})`);
      }
    }

    // Check for removed stores
    for (const [storeId, existingStore] of existingStoresMap) {
      if (!newStoreIds.has(storeId)) {
        removedStores.push(existingStore);
        removed++;
        console.log(
          `  🚫 STORE REMOVED: ${existingStore.name} (${existingStore.city})`
        );
        // Note: We keep the store in DB for historical data
        // but could mark it as inactive if needed
      }
    }

    // Summary
    if (added > 0 || removed > 0) {
      console.log(`\n  ⚠️  STORE CHANGES DETECTED:`);
      if (added > 0) console.log(`     • ${added} new store(s) added`);
      if (removed > 0) console.log(`     • ${removed} store(s) removed`);
    } else {
      console.log(`  ✓ No store changes detected`);
    }

    return { added, updated, removed, newStores, removedStores };
  }

  /**
   * Sync a store with Firestore (update product/category counts)
   */
  async syncStore(
    store: IkeaStore,
    productsCount: number,
    categoriesCount: number
  ): Promise<void> {
    const storeDoc: IkeaStoreDocument = {
      id: store.id,
      name: store.name,
      city: store.city || '',
      region: store.region || '',
      country: store.country,
      lastSync: new Date(),
      productsCount,
      categoriesCount,
    };

    await this.storesAdapter.save(storeDoc, store.id);
  }

  /**
   * Sync categories for a store
   */
  async syncCategories(
    storeId: string,
    categories: IkeaCategory[]
  ): Promise<void> {
    // Delete old categories for this store
    await this.categoriesAdapter.deleteByQuery('storeId', '==', storeId);

    // Add new categories
    for (const category of categories) {
      const categoryDoc: IkeaCategoryDocument = {
        id: category.id,
        name: category.name,
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        productCount: category.productCount || 0,
        storeId,
        lastSync: new Date(),
      };

      await this.categoriesAdapter.save(
        categoryDoc,
        `${storeId}-${category.id}`
      );
    }
  }

  /**
   * Sync products for a store
   * - Add new products
   * - Update existing products
   * - Remove products no longer available
   */
  async syncProducts(
    storeId: string,
    newProducts: IkeaProduct[]
  ): Promise<{
    added: number;
    updated: number;
    removed: number;
  }> {
    let added = 0;
    let updated = 0;
    let removed = 0;

    // Get existing products for this store
    const existingProducts = await this.productsAdapter.query(
      'storeId',
      '==',
      storeId
    );

    // Create a map of existing products by ID for quick lookup
    const existingProductsMap = new Map<string, IkeaProductDocument>();
    existingProducts.forEach((p) => {
      existingProductsMap.set(p.id, p);
    });

    // Create a set of new product IDs
    const newProductIds = new Set(newProducts.map((p) => p.id));

    // Process new products (add or update)
    for (const product of newProducts) {
      const existingProduct = existingProductsMap.get(product.id);

      if (existingProduct) {
        // Check if product has actually changed
        const hasChanged =
          existingProduct.name !== product.name ||
          existingProduct.price.current !== product.price.current ||
          existingProduct.price.original !== product.price.original ||
          existingProduct.availability !== product.availability ||
          existingProduct.condition !== (product.condition || '') ||
          JSON.stringify(existingProduct.images) !==
            JSON.stringify(product.images || []);

        if (hasChanged) {
          // Update existing product only if changed
          const updatedProduct: IkeaProductDocument = {
            id: product.id,
            offerId: product.offerId,
            articleNumbers: product.articleNumbers || [],
            name: product.name,
            description: product.description || '',
            price: {
              current: product.price.current,
              original: product.price.original,
              currency: product.price.currency,
              discount: product.price.discount,
            },
            condition: product.condition || '',
            category: product.category || '',
            categoryId: product.categoryId || '',
            images: product.images || [],
            storeId: product.storeId,
            storeName: product.storeName || '',
            availability: product.availability,
            url: product.url || '',
            isInBox: product.isInBox || false,
            reasonDiscount: product.reasonDiscount || '',
            additionalInfo: product.additionalInfo || '',
            lastSync: new Date(),
            firstSeen: existingProduct.firstSeen, // Keep original firstSeen
            lastSeen: new Date(),
          };

          await this.productsAdapter.save(updatedProduct, product.id);
          updated++;
        }
        // If nothing changed, skip save
      } else {
        // Add new product
        const newProduct: IkeaProductDocument = {
          id: product.id,
          offerId: product.offerId,
          articleNumbers: product.articleNumbers || [],
          name: product.name,
          description: product.description || '',
          price: {
            current: product.price.current,
            original: product.price.original,
            currency: product.price.currency,
            discount: product.price.discount,
          },
          condition: product.condition || '',
          category: product.category || '',
          categoryId: product.categoryId || '',
          images: product.images || [],
          storeId: product.storeId,
          storeName: product.storeName || '',
          availability: product.availability,
          url: product.url || '',
          isInBox: product.isInBox || false,
          reasonDiscount: product.reasonDiscount || '',
          additionalInfo: product.additionalInfo || '',
          lastSync: new Date(),
          firstSeen: new Date(),
          lastSeen: new Date(),
        };

        await this.productsAdapter.save(newProduct, product.id);
        added++;
      }
    }

    // Remove products that no longer exist
    for (const productId of existingProductsMap.keys()) {
      if (!newProductIds.has(productId)) {
        await this.productsAdapter.delete(productId);
        removed++;
      }
    }

    console.log(
      `  ✓ Products synced: ${added > 0 ? `+${added} added` : ''}${
        added > 0 && (updated > 0 || removed > 0) ? ', ' : ''
      }${updated > 0 ? `~${updated} updated` : ''}${
        (added > 0 || updated > 0) && removed > 0 ? ', ' : ''
      }${removed > 0 ? `-${removed} removed` : ''}${
        added === 0 && updated === 0 && removed === 0 ? 'no changes' : ''
      }`
    );

    return { added, updated, removed };
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalStores: number;
    totalCategories: number;
    totalProducts: number;
    availableProducts: number;
  }> {
    const storesSnapshot = await this.storesAdapter
      .getCollection()
      .count()
      .get();
    const categoriesSnapshot = await this.categoriesAdapter
      .getCollection()
      .count()
      .get();
    const productsSnapshot = await this.productsAdapter
      .getCollection()
      .count()
      .get();
    const availableSnapshot = await this.productsAdapter
      .getCollection()
      .where('availability', '==', 'available')
      .count()
      .get();

    return {
      totalStores: storesSnapshot.data().count,
      totalCategories: categoriesSnapshot.data().count,
      totalProducts: productsSnapshot.data().count,
      availableProducts: availableSnapshot.data().count,
    };
  }
}

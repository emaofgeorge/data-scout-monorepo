/**
 * IKEA Circularity types and interfaces
 */

/**
 * IKEA Store
 */
export interface IkeaStore {
  id: string;
  name: string;
  city?: string;
  region?: string;
  country: string;
}

/**
 * IKEA Product Category
 */
export interface IkeaCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
}

/**
 * IKEA Circular Product
 */
export interface IkeaProduct {
  id: string;
  offerId: string;
  articleNumbers: string[]; // IKEA article numbers
  name: string;
  description?: string;
  price: {
    current: number;
    original?: number;
    currency: string;
    discount?: number;
  };
  condition?: string;
  category?: string;
  categoryId?: string;
  images: string[];
  storeId: string;
  storeName?: string;
  location?: string;
  availability: 'available' | 'sold' | 'reserved';
  url?: string;
  isInBox?: boolean; // If product is in original box
  reasonDiscount?: string; // Reason for discount
  additionalInfo?: string; // Additional product info
  lastSeen: Date;
  firstSeen: Date;
}

/**
 * API Response for categories
 */
export type IkeaCategoriesResponse = Array<{
  id: number;
  name: string;
  category_code: string;
  country_code: string;
  lang_code: string;
  topLevelParentCategories: string[];
  immediateLevelParentCategories: string[];
}>;

/**
 * API Response for products search
 */
export interface IkeaProductsSearchResponse {
  content: Array<{
    articleNumbers: string[];
    storeId: string;
    title: string;
    description?: string;
    currency: string;
    heroImage?: string;
    media?: Array<{
      url: string;
      type: string;
    }>;
    originalPrice?: number;
    minPrice: number;
    maxPrice: number;
    offers: Array<{
      id: number;
      offerUuid: string;
      offerNumber: string;
      description: string;
      additionalInfo?: string;
      price: number;
      productConditionCode: string;
      productConditionTitle?: string;
      productConditionDescription?: string;
      isInBox: boolean;
      reasonDiscount?: string;
    }>;
  }>;
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
}

/**
 * Firestore document structure for Store
 */
export interface IkeaStoreDocument {
  id: string;
  name: string;
  city?: string;
  region?: string;
  country: string;
  lastSync: Date;
  productsCount: number;
  categoriesCount: number;
}

/**
 * Firestore document structure for Category
 */
export interface IkeaCategoryDocument extends IkeaCategory {
  storeId: string;
  lastSync: Date;
}

/**
 * Firestore document structure for Product
 */
export interface IkeaProductDocument {
  id: string;
  offerId: string;
  articleNumbers: string[];
  name: string;
  description: string;
  price: {
    current: number;
    original?: number;
    currency: string;
    discount?: number;
  };
  condition: string;
  category: string;
  categoryId: string;
  images: string[];
  storeId: string;
  storeName: string;
  availability: 'available' | 'sold' | 'reserved';
  url: string;
  isInBox: boolean;
  reasonDiscount: string;
  additionalInfo: string;
  lastSync: Date;
  firstSeen: Date;
  lastSeen: Date;
}

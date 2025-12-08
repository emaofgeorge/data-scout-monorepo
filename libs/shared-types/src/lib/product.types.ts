/**
 * Product information
 */
export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  availability?: 'in-stock' | 'out-of-stock' | 'unknown';
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Product category
 */
export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string;
}

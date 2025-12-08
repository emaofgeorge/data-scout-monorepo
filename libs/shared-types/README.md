# @data-scout/shared-types

Shared TypeScript types and interfaces for the Data Scout platform.

## Overview

This library contains common type definitions used across all applications and libraries in the monorepo. It ensures type consistency and enables better code sharing.

## Key Types

- **Product**: Product information structure
- **ProductCategory**: Product categorization
- **ScraperResult**: Result of a scraping operation
- **ScraperStatus**: Scraper execution status

## Usage

```typescript
import { Product, ScraperResult } from '@data-scout/shared-types';

const result: ScraperResult<Product[]> = {
  success: true,
  data: products,
  timestamp: new Date(),
  scraperName: 'ikea-circularity',
  itemsProcessed: products.length
};
```

## Status

🚧 **Work in Progress** - This is a placeholder library. Additional types will be added as needed.

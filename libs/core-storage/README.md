# @data-scout/core-storage

Storage abstraction layer for the Data Scout platform.

## Overview

This library provides a pluggable storage architecture that allows scrapers to save data to various backends without changing their code. The factory pattern enables easy switching between storage implementations.

## Key Components

- **IStorageAdapter**: Interface for storage adapters
- **StorageFactory**: Factory for creating storage adapters
- **StorageConfig**: Configuration interface

## Supported Backends (Planned)

- JSON files
- Databases (PostgreSQL, MongoDB)
- Cloud storage (S3, Google Cloud Storage)

## Usage

```typescript
import { StorageFactory } from '@data-scout/core-storage';

const storage = StorageFactory.create({
  type: 'json',
  path: './data/output.json'
});

await storage.save(data);
```

## Status

🚧 **Work in Progress** - This is a placeholder library. Implementation coming soon.

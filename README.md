# Data Scout

A modular scraping platform built with NX monorepo architecture.

## Architecture

This monorepo contains a scalable, modular scraping platform designed to host multiple independent scraper applications with shared core libraries.

### Structure

```
data-scout/
├── apps/
│   └── ikea-circularity/          # IKEA Circularity scraper app
├── libs/
│   ├── core-scraper/              # Scraper interfaces and base classes
│   ├── core-storage/              # Pluggable storage adapters
│   ├── core-notifications/        # Pluggable notification adapters
│   └── shared-types/              # Shared TypeScript types
```

### Apps

- **ikea-circularity**: Scraper for IKEA circularity data (placeholder)

### Libraries

- **core-scraper**: Base interfaces and abstract classes for implementing scrapers
- **core-storage**: Storage abstraction layer supporting multiple backends (JSON, Database, Cloud)
- **core-notifications**: Notification abstraction layer supporting multiple channels (Email, Slack, Webhook, Console)
- **shared-types**: Common TypeScript types and interfaces used across the monorepo

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- Firebase project (for production) or Firebase Emulator (for development)

### Installation

```bash
npm install
```

### Firebase Setup

#### For Development (Emulator)

```bash
# Start Firebase emulators
npm run firebase:emulators

# Or with data persistence
npm run firebase:emulators:import
```

#### For Production

1. Create a Firebase project
2. Enable Firestore
3. Download service account key
4. Configure `.env` file with credentials

### Development

```bash
# Start IKEA scraper in development mode
npm start

# Start with watch mode
npm run start:dev

# Build all projects
npm run build

# Build only ikea-circularity
npm run build:ikea

# Build only libraries
npm run build:libs
```

### Testing

```bash
# Run all tests
npm test

# Run tests for ikea-circularity
npm run test:ikea

# Run tests in watch mode
npm run test:watch
```

### Linting & Formatting

```bash
# Lint all projects
npm run lint

# Lint and fix
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Utilities

```bash
# Visualize project graph
npm run graph

# Clean NX cache
npm run clean

# Sync workspace
npm run sync
```

### Adding New Scrapers

To add a new scraper application:

```bash
npx nx g @nx/node:application <scraper-name> --directory=apps/<scraper-name>
```

## Available Scripts

| Command                      | Description                 |
| ---------------------------- | --------------------------- |
| `npm start`                  | Start ikea-circularity app  |
| `npm run start:dev`          | Start with watch mode       |
| `npm run build`              | Build all projects          |
| `npm run build:ikea`         | Build ikea-circularity only |
| `npm run build:libs`         | Build all libraries         |
| `npm test`                   | Run all tests               |
| `npm run test:ikea`          | Test ikea-circularity       |
| `npm run lint`               | Lint all projects           |
| `npm run lint:fix`           | Lint and auto-fix           |
| `npm run format`             | Format code with Prettier   |
| `npm run graph`              | Visualize dependency graph  |
| `npm run firebase:emulators` | Start Firebase emulators    |
| `npm run clean`              | Clean NX cache              |

## Roadmap

- [x] Implement Firestore storage adapter
- [x] Implement HTTP client with browser spoofing
- [x] Implement IKEA Circularity scraper logic
- [x] Add data synchronization with Firestore
- [ ] Add notification adapters (Email, Slack, Webhook)
- [ ] Add scheduling capabilities (cron jobs)
- [ ] Add monitoring and health checks
- [ ] Add web dashboard for data visualization
- [ ] Add more scraper applications

## License

MIT

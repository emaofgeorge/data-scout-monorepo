# Quick Start Guide

## Setup Iniziale

```bash
# 1. Installa le dipendenze
npm install

# 2. Build delle librerie
npm run build:libs

# 3. Build dell'app
npm run build:ikea
```

## Sviluppo

### Con Firebase Emulator (consigliato per sviluppo)

```bash
# Terminale 1: Avvia Firebase Emulator
npm run firebase:emulators

# Terminale 2: Avvia l'app
npm start
```

### Con Firebase Production

```bash
# 1. Configura .env con le credenziali Firebase
cp .env.example .env
# Modifica .env con i tuoi valori

# 2. Avvia l'app
npm start
```

## Comandi Disponibili

### Build & Run

| Comando              | Descrizione                              |
| -------------------- | ---------------------------------------- |
| `npm start`          | Avvia ikea-circularity in modalità serve |
| `npm run start:dev`  | Avvia con watch mode                     |
| `npm run build`      | Build di tutti i progetti                |
| `npm run build:ikea` | Build solo ikea-circularity              |
| `npm run build:libs` | Build solo le librerie                   |

### Testing

| Comando              | Descrizione                |
| -------------------- | -------------------------- |
| `npm test`           | Esegui tutti i test        |
| `npm run test:ikea`  | Test solo ikea-circularity |
| `npm run test:watch` | Test in watch mode         |

### Code Quality

| Comando                | Descrizione                     |
| ---------------------- | ------------------------------- |
| `npm run lint`         | Lint di tutti i progetti        |
| `npm run lint:ikea`    | Lint solo ikea-circularity      |
| `npm run lint:fix`     | Lint con auto-fix               |
| `npm run format`       | Formatta il codice con Prettier |
| `npm run format:check` | Controlla la formattazione      |

### Firebase

| Comando                             | Descrizione                              |
| ----------------------------------- | ---------------------------------------- |
| `npm run firebase:emulators`        | Avvia Firebase Emulator (Firestore + UI) |
| `npm run firebase:emulators:export` | Avvia con export dei dati alla chiusura  |
| `npm run firebase:emulators:import` | Avvia importando dati precedenti         |

L'emulatore sarà disponibile su:

- Firestore: `http://localhost:8080`
- Emulator UI: `http://localhost:4000`

### Utilities

| Comando         | Descrizione                          |
| --------------- | ------------------------------------ |
| `npm run graph` | Visualizza il grafo delle dipendenze |
| `npm run clean` | Pulisci la cache di NX               |
| `npm run sync`  | Sincronizza il workspace             |

## Workflow di Sviluppo Tipico

1. **Prima volta:**

   ```bash
   npm install
   npm run build:libs
   ```

2. **Sviluppo giornaliero:**

   ```bash
   # Terminale 1
   npm run firebase:emulators

   # Terminale 2
   npm start
   ```

3. **Prima di commit:**

   ```bash
   npm run lint:fix
   npm run format
   npm test
   ```

4. **Build production:**
   ```bash
   npm run build
   ```

## Struttura Firebase

L'emulatore crea automaticamente 3 collections:

- `ikea_stores` - Store IKEA
- `ikea_categories` - Categorie per store
- `ikea_products` - Prodotti in vendita

Puoi visualizzare e modificare i dati tramite l'Emulator UI.

## Troubleshooting

### "Module not found" errors

```bash
npm run clean
npm run build:libs
npm run build:ikea
```

### Firebase connection errors

Verifica che l'emulatore sia avviato o che le credenziali in `.env` siano corrette.

### TypeScript errors

```bash
npm run sync
npx nx reset
npm run build:libs
```

### Port già in uso

Cambia le porte in `firebase.json` se 8080 o 4000 sono già occupate.

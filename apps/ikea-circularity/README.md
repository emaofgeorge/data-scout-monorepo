# IKEA Circularity Scraper

Applicazione per il monitoraggio dei prodotti di seconda mano nell'angolo della circolarità di IKEA.

## Descrizione

Questa app monitora i prodotti dell'angolo circolarità di IKEA in tutti gli store italiani, sincronizzando i dati con Firestore:

- Scraping automatico di tutti gli store IKEA in Italia
- Salvataggio strutturato su Firestore (store, categorie, prodotti)
- Rilevamento automatico di nuovi prodotti, aggiornamenti e rimozioni
- Simulazione browser Chrome per evitare blocchi IP
- Gestione intelligente dei rate limits

## Caratteristiche

✅ **15 Store IKEA italiani** coperti  
✅ **Sync completo** di store, categorie e prodotti  
✅ **Tracking automatico** di aggiunte, modifiche e rimozioni  
✅ **Browser spoofing** con user-agent rotation  
✅ **Rate limiting** intelligente con delay randomizzati  
✅ **Firestore** come database

## Setup

### 1. Firebase Setup

1. Crea un progetto Firebase
2. Abilita Firestore Database
3. Genera una chiave di servizio (Service Account):
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Salva il file JSON in una posizione sicura

### 2. Configurazione

Crea un file `.env` nella root del progetto:

```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json
```

### 3. Installazione

```bash
# Dalla root del monorepo
npm install

# Build delle librerie
npx nx run-many -t build --projects=core-scraper,core-storage,shared-types

# Build dell'app
npx nx build ikea-circularity
```

## Esecuzione

```bash
# Run in development mode
npx nx serve ikea-circularity

# Run in production mode
npx nx build ikea-circularity
node dist/apps/ikea-circularity/main.js
```

## Struttura Firestore

Il database Firestore avrà la seguente struttura:

```
ikea_stores/
  {storeId}/
    - id: string
    - name: string
    - city: string
    - region: string
    - lastSync: timestamp
    - productsCount: number
    - categoriesCount: number

ikea_categories/
  {storeId-categoryId}/
    - id: string
    - name: string
    - storeId: string
    - productCount: number
    - lastSync: timestamp

ikea_products/
  {storeId-offerId}/
    - id: string
    - offerId: string
    - name: string
    - description: string
    - price: object
    - category: string
    - images: array
    - storeId: string
    - availability: string
    - firstSeen: timestamp
    - lastSeen: timestamp
```

## API Utilizzate

L'app utilizza le API pubbliche di IKEA:

- **Categorie**: `https://web-api.ikea.com/circular/circular-asis/api/public/categories/it/it/{storeId}`
- **Prodotti**: `https://web-api.ikea.com/circular/circular-asis/offers/grouped/search?languageCode=it&size=32&storeIds={storeId}&page={page}`

## Store Italiani

L'app monitora 15 store IKEA in Italia:

- Milano San Giuliano, Corsico, Carugate
- Roma Anagnina
- Bologna Casalecchio
- Roncadelle (Brescia)
- Parma, Padova, Torino, Bari, Genova, Napoli, Pisa, Firenze, Catania

## Dipendenze Principali

- `firebase-admin` - Firestore integration
- `axios` - HTTP requests
- `user-agents` - Browser user-agent spoofing
- `@data-scout/core-scraper` - Base scraper classes
- `@data-scout/core-storage` - Storage adapters
- `@data-scout/shared-types` - Type definitions

## Sviluppo Futuro

- [ ] Notifiche per nuovi prodotti interessanti
- [ ] Dashboard web per visualizzare i dati
- [ ] Filtri per categoria, prezzo, città
- [ ] API REST per accesso ai dati
- [ ] Scheduling automatico (cron job)
- [ ] Tracking storico dei prezzi

import { IkeaStore } from '@data-scout/shared-types';

/**
 * List of IKEA stores in Italy
 * Store IDs can be found by inspecting network calls on IKEA website
 */
export const IKEA_STORES: IkeaStore[] = [
  {
    id: '356',
    name: 'IKEA Milano San Giuliano',
    city: 'San Giuliano Milanese',
    region: 'Lombardia',
    country: 'IT',
  },
  {
    id: '024',
    name: 'IKEA Corsico',
    city: 'Corsico',
    region: 'Lombardia',
    country: 'IT',
  },
  {
    id: '388',
    name: 'IKEA Carugate',
    city: 'Carugate',
    region: 'Lombardia',
    country: 'IT',
  },
  {
    id: '260',
    name: 'IKEA Anagnina Roma',
    city: 'Roma',
    region: 'Lazio',
    country: 'IT',
  },
  {
    id: '324',
    name: 'IKEA Casalecchio',
    city: 'Casalecchio di Reno',
    region: 'Emilia-Romagna',
    country: 'IT',
  },
  {
    id: '398',
    name: 'IKEA Roncadelle',
    city: 'Roncadelle',
    region: 'Lombardia',
    country: 'IT',
  },
  {
    id: '330',
    name: 'IKEA Parma',
    city: 'Parma',
    region: 'Emilia-Romagna',
    country: 'IT',
  },
  {
    id: '299',
    name: 'IKEA Padova',
    city: 'Padova',
    region: 'Veneto',
    country: 'IT',
  },
  {
    id: '389',
    name: 'IKEA Torino',
    city: 'Torino',
    region: 'Piemonte',
    country: 'IT',
  },
  {
    id: '360',
    name: 'IKEA Bari',
    city: 'Bari',
    region: 'Puglia',
    country: 'IT',
  },
  {
    id: '332',
    name: 'IKEA Genova',
    city: 'Genova',
    region: 'Liguria',
    country: 'IT',
  },
  {
    id: '407',
    name: 'IKEA Napoli',
    city: 'Napoli',
    region: 'Campania',
    country: 'IT',
  },
  {
    id: '421',
    name: 'IKEA Pisa',
    city: 'Pisa',
    region: 'Toscana',
    country: 'IT',
  },
  {
    id: '372',
    name: 'IKEA Firenze',
    city: 'Firenze',
    region: 'Toscana',
    country: 'IT',
  },
  {
    id: '464',
    name: 'IKEA Catania',
    city: 'Catania',
    region: 'Sicilia',
    country: 'IT',
  },
];

/**
 * Get stores by region
 */
export function getStoresByRegion(region: string): IkeaStore[] {
  return IKEA_STORES.filter((store) => store.region === region);
}

/**
 * Get store by ID
 */
export function getStoreById(id: string): IkeaStore | undefined {
  return IKEA_STORES.find((store) => store.id === id);
}

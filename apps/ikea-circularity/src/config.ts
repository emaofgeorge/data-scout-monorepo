/**
 * Configuration for IKEA Circularity Scraper
 */
export const config = {
  scraper: {
    name: 'ikea-circularity',
    url: 'https://www.ikea.com', // Placeholder URL
    interval: 3600000, // 1 hour in milliseconds
  },
  storage: {
    type: 'json' as const,
    path: './data/ikea-circularity.json',
  },
  notifications: {
    type: 'console' as const,
  },
};

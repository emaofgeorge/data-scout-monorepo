import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import UserAgent from 'user-agents';
import { IkeaStore } from '@data-scout/shared-types';

/**
 * HTTP Client that mimics a real Chrome browser
 * Includes realistic headers and user-agent rotation
 */
export class BrowserHttpClient {
  private client: AxiosInstance;
  private userAgent: UserAgent;

  constructor(baseURL?: string, ikeaStore?: IkeaStore) {
    console.log('IkeaStore', ikeaStore);
    this.userAgent = new UserAgent({ deviceCategory: 'desktop' });

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: this.getBrowserHeaders(),
    });

    // Add request interceptor to rotate user agent and add delays
    this.client.interceptors.request.use(
      async (config) => {
        // Rotate user agent occasionally
        if (Math.random() < 0.1) {
          this.userAgent = new UserAgent({ deviceCategory: 'desktop' });
          config.headers['User-Agent'] = this.userAgent.toString();
        }

        // Add small random delay to appear more human-like
        await this.randomDelay(500, 1500);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limited - wait longer
          console.warn('Rate limited, waiting before retry...');
          await this.randomDelay(5000, 10000);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get realistic browser headers
   */
  private getBrowserHeaders(): Record<string, string> {
    return {
      'User-Agent': this.userAgent.toString(),
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Sec-Ch-Ua':
        '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };
  }

  /**
   * Random delay to simulate human behavior
   */
  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Set custom header
   */
  setHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  /**
   * Get axios instance for advanced usage
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

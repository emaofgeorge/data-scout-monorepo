export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEnvMs(name: string, defaultMs = 0): number {
  const val = process.env[name];
  if (!val) return defaultMs;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultMs : parsed;
}

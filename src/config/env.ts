// Environment configuration with validation
interface EnvConfig {
  // API Configuration
  apiBaseUrl: string;
  apiTimeoutMs: number;
  
  // Feature Flags
  enableTicker: boolean;
  enableNews: boolean;
  
  // Ticker Configuration
  tickerProvider: string;
  tickerSymbols: string[];
  tickerRefreshIntervalMs: number;
  
  // News Configuration
  newsProvider: string;
  newsMaxArticles: number;
  newsRefreshIntervalMs: number;
  
  // API Keys
  newsApiKey: string;
  guardianKey: string;
  polygonKey: string;
  finnhubKey: string;
  
  // Development
  isDevelopment: boolean;
  isProduction: boolean;
  debug: boolean;
  
  // Upload Settings
  maxFileSizeMB: number;
  
  // CSP Configuration
  cspConnectSrc: string[];
}

// Environment variable validation
function getRequiredEnv(key: string): string {
  const value = (import.meta as any).env?.[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return (import.meta as any).env?.[key] || defaultValue;
}

function getOptionalEnvNumber(key: string, defaultValue: number): number {
  const value = (import.meta as any).env?.[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getOptionalEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = (import.meta as any).env?.[key];
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

function getOptionalEnvArray(key: string, defaultValue: string[]): string[] {
  const value = (import.meta as any).env?.[key];
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

// Validate and build configuration
function buildConfig(): EnvConfig {
  try {
    const config: EnvConfig = {
      // API Configuration
      apiBaseUrl: getOptionalEnv('VITE_API_BASE_URL', 'http://localhost:3000'),
      apiTimeoutMs: getOptionalEnvNumber('VITE_API_TIMEOUT_MS', 10000),
      
      // Feature Flags
      enableTicker: getOptionalEnvBoolean('VITE_ENABLE_TICKER', true),
      enableNews: getOptionalEnvBoolean('VITE_ENABLE_NEWS', true),
      
      // Ticker Configuration
      tickerProvider: getOptionalEnv('VITE_TICKER_PROVIDER', 'mock'),
      tickerSymbols: getOptionalEnvArray('VITE_TICKER_SYMBOLS', ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']),
      tickerRefreshIntervalMs: getOptionalEnvNumber('VITE_TICKER_REFRESH_INTERVAL_MS', 30000),
      
      // News Configuration
      newsProvider: getOptionalEnv('VITE_NEWS_PROVIDER', 'mock'),
      newsMaxArticles: getOptionalEnvNumber('VITE_NEWS_MAX_ARTICLES', 6),
      newsRefreshIntervalMs: getOptionalEnvNumber('VITE_NEWS_REFRESH_INTERVAL_MS', 300000),
      
      // API Keys
      newsApiKey: getOptionalEnv('VITE_NEWSAPI_KEY', ''),
      guardianKey: getOptionalEnv('VITE_GUARDIAN_KEY', ''),
      polygonKey: getOptionalEnv('VITE_POLYGON_KEY', ''),
      finnhubKey: getOptionalEnv('VITE_FINNHUB_KEY', ''),
      
      // Development
      isDevelopment: (import.meta as any).env?.DEV || false,
      isProduction: (import.meta as any).env?.PROD || false,
      debug: getOptionalEnvBoolean('VITE_DEBUG', false),
      
      // Upload Settings
      maxFileSizeMB: getOptionalEnvNumber('VITE_MAX_FILE_MB', 25),
      
      // CSP Configuration
      cspConnectSrc: [
        'self',
        'ws://localhost:*',
        'http://localhost:*',
        ...(getOptionalEnv('VITE_POLYGON_KEY') ? ['https://api.polygon.io'] : []),
        ...(getOptionalEnv('VITE_NEWSAPI_KEY') ? ['https://newsapi.org'] : []),
        ...(getOptionalEnv('VITE_GUARDIAN_KEY') ? ['https://content.guardianapis.com'] : []),
      ],
    };
    
    return config;
  } catch (error) {
    console.error('Environment configuration error:', error);
    throw new Error(`Failed to load environment configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export validated configuration
export const env = buildConfig();

// Export individual values for convenience
export const {
  apiBaseUrl,
  apiTimeoutMs,
  enableTicker,
  enableNews,
  tickerProvider,
  tickerSymbols,
  tickerRefreshIntervalMs,
  newsProvider,
  newsMaxArticles,
  newsRefreshIntervalMs,
  newsApiKey,
  guardianKey,
  polygonKey,
  finnhubKey,
  isDevelopment,
  isProduction,
  debug,
  maxFileSizeMB,
  cspConnectSrc,
} = env;

// Type export
export type { EnvConfig };

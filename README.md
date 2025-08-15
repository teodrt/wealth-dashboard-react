# Wealth Dashboard React

## Stable Version Backup

Current stable restore point: branch `stable-ui-performance-fix` / tag `v1.0.0-stable-scroll-fix`

To revert:

```bash
git fetch --all
git checkout stable-ui-performance-fix
# OR
git checkout tags/v1.0.0-stable-scroll-fix
```

## Stable Version Info

Latest stable: branch `stable` / tag `last-stable`

To restore:
```bash
git fetch --all
git checkout stable
# OR
git checkout tags/last-stable
```

📌 Come ripristinare al volo in caso di problemi
```bash
git fetch --all
git checkout stable
# oppure
git checkout tags/last-stable
```

A modern, responsive wealth management dashboard built with React, TypeScript, and Vite.

## Data persistence

Client-side data is persisted in localStorage under the key `wd_rows_v3`. Only raw uploaded rows are stored; derived charts and aggregates are recomputed on app load.

## Configuration & Environment

### Environment Variables

The application uses environment variables for configuration. Copy `env.example` to `.env.local` and customize as needed:

```bash
cp env.example .env.local
```

#### Required Variables

None - all variables have sensible defaults.

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL for API calls |
| `VITE_API_TIMEOUT_MS` | `10000` | API request timeout in milliseconds |
| `VITE_ENABLE_TICKER` | `true` | Enable stock ticker component |
| `VITE_ENABLE_NEWS` | `true` | Enable news hub component |
| `VITE_TICKER_PROVIDER` | `mock` | Ticker data provider (mock/polygon/finnhub) |
| `VITE_TICKER_SYMBOLS` | `AAPL,MSFT,GOOGL,AMZN,NVDA` | Stock symbols to display |
| `VITE_TICKER_REFRESH_INTERVAL_MS` | `30000` | Ticker refresh interval in milliseconds |
| `VITE_NEWS_PROVIDER` | `mock` | News data provider (mock/newsapi/guardian) |
| `VITE_NEWS_MAX_ARTICLES` | `6` | Maximum number of news articles to display |
| `VITE_NEWS_REFRESH_INTERVAL_MS` | `300000` | News refresh interval in milliseconds |
| `VITE_MAX_FILE_MB` | `25` | Maximum file upload size in MB |
| `VITE_DEBUG` | `false` | Enable debug logging |

#### API Keys

For production use, you can provide API keys for real data:

- `VITE_NEWSAPI_KEY` - NewsAPI.org key for real news
- `VITE_GUARDIAN_KEY` - Guardian API key for news
- `VITE_POLYGON_KEY` - Polygon.io key for stock data
- `VITE_FINNHUB_KEY` - Finnhub key for financial data

**Note**: API keys are optional. The app will fall back to mock data if not provided.

### Environment Setup

#### Development
```bash
# Copy example environment
cp env.example .env.local

# Customize values as needed
# Start development server
npm run dev
```

#### Production
```bash
# Set production environment variables
export NODE_ENV=production
export VITE_API_BASE_URL=https://your-api.com
export VITE_ENABLE_TICKER=true
export VITE_ENABLE_NEWS=true

# Build and deploy
npm run build
```

### Gotchas & Troubleshooting

1. **Vite Variables**: All environment variables must be prefixed with `VITE_` to be accessible in the client
2. **CSP Headers**: Content Security Policy is automatically configured based on your API keys
3. **File Uploads**: Maximum file size is enforced both client and server-side
4. **API Timeouts**: Default timeout is 10 seconds, adjust based on your API performance
5. **Mock Fallback**: Components gracefully fall back to mock data if APIs are unavailable

### Switching Environments

To switch between environments, simply update your `.env.local` file:

```bash
# Development
VITE_API_BASE_URL=http://localhost:3000
VITE_DEBUG=true

# Staging
VITE_API_BASE_URL=https://staging-api.yourapp.com
VITE_DEBUG=false

# Production
VITE_API_BASE_URL=https://api.yourapp.com
VITE_DEBUG=false
```

No code changes required - the app automatically adapts to your environment configuration.

## Cascading Filters (Categories → Subs)

- The top-level category is stored in `src/store/filters.ts` (`category`).
- The subcategory list is data-driven via `selectAvailableSubs(raw, category)` in `src/selectors/portfolio.ts`.
- When the category changes, `setCategory` prunes an incompatible `sub` automatically.
- The second-level select in `components/FiltersBar.tsx` shows only valid subs and becomes disabled when none are available.
- Charts and right panel derive from selectors that apply both filters in one pass.

### Adding a new category
1. Add the category in `src/config/categories.ts` (`CATEGORIES` and `CategoryId` union).
2. (Optional) Add aliases in `CATEGORY_ALIASES` for parsing.
3. Upload data where `ParsedRow.master` uses the new category.
4. The cascading mechanism will pick up subs automatically from your data.

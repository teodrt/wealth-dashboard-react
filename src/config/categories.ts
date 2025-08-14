export type CategoryId =
  | 'real_estate'
  | 'growth_investments'
  | 'luxury_assets'
  | 'dividend_investments'
  | 'fixed_income'
  | 'alternatives';

export type CategoryDef = { id: CategoryId; label: string; emoji?: string };

export const CATEGORIES: CategoryDef[] = [
  { id: 'real_estate',         label: 'REAL ESTATE',          emoji: '🏠' },
  { id: 'growth_investments',  label: 'GROWTH INVESTMENTS',   emoji: '📈' },
  { id: 'luxury_assets',       label: 'LUXURY ASSETS',        emoji: '💎' },
  { id: 'dividend_investments',label: 'DIVIDEND INVESTMENTS', emoji: '💰' },
  { id: 'fixed_income',        label: 'FIXED INCOME',         emoji: '🏦' },
  { id: 'alternatives',        label: 'ALTERNATIVES',         emoji: '🚀' },
];

// Aliases/synonyms accepted from Excel (lowercased/normalized)
export const CATEGORY_ALIASES: Record<string, CategoryId> = {
  'real estate': 'real_estate',
  'property': 'real_estate',
  'immobiliare': 'real_estate',

  'growth investments': 'growth_investments',
  'growth': 'growth_investments',
  'equities growth': 'growth_investments',
  'stocks growth': 'growth_investments',

  'luxury assets': 'luxury_assets',
  'luxury': 'luxury_assets',
  'collectibles': 'luxury_assets',
  'art': 'luxury_assets',
  'watch': 'luxury_assets',
  'watches': 'luxury_assets',

  'dividend investments': 'dividend_investments',
  'dividends': 'dividend_investments',
  'high dividend': 'dividend_investments',

  'fixed income': 'fixed_income',
  'bonds': 'fixed_income',
  'treasuries': 'fixed_income',
  'etf bond': 'fixed_income',

  'alternatives': 'alternatives',
  'crypto': 'alternatives',
  'private equity': 'alternatives',
  'venture': 'alternatives',
  'hedge fund': 'alternatives',
};

// Helper exports
export const CATEGORY_IDS = CATEGORIES.map(c => c.id);
export function isCategoryId(x: string): x is CategoryId { 
  return (CATEGORY_IDS as string[]).includes(x); 
}

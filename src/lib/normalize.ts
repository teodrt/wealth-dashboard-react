import { Txn } from '../store/dataStore';

// Header synonyms (case-insensitive)
const HEADER_SYNONYMS = {
  date: ['date', 'data', 'fecha', 'dat', 'giorno'],
  account: ['account', 'conto', 'acount', 'acc', 'bank'],
  category: ['category', 'categoria', 'cat', 'categ'],
  asset: ['asset', 'titolo', 'strumento', 'security', 'stock'],
  amount: ['amount', 'importo', 'ammontare', 'valore', 'value', 'sum'],
  currency: ['currency', 'valuta', 'moneta', 'curr', 'ccy'],
  note: ['note', 'descrizione', 'memo', 'description', 'desc']
};

// Find header mapping
function findHeaderMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Map each synonym group to actual header
  Object.entries(HEADER_SYNONYMS).forEach(([key, synonyms]) => {
    const foundHeader = lowerHeaders.find(header => 
      synonyms.some(synonym => header.includes(synonym))
    );
    if (foundHeader) {
      const originalIndex = lowerHeaders.indexOf(foundHeader);
      mapping[key] = headers[originalIndex];
    }
  });
  
  return mapping;
}

// Parse amount with EU/US format support
function parseAmount(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value).trim();
  if (!str) return 0;
  
  // Remove currency symbols and spaces
  let cleaned = str.replace(/[€$£¥\s]/g, '');
  
  // Handle EU format (1.234,56) vs US format (1,234.56)
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // EU format: 1.234,56 -> 1234.56
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> 1234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // EU format: 1,234 -> 1234
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Parse date with multiple format support
function parseDate(value: any): string {
  if (!value) return '';
  
  const str = String(value).trim();
  if (!str) return '';
  
  // If already ISO format, return as is
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str;
  }
  
  // Try to parse various formats
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Handle dd/MM/yyyy and MM/dd/yyyy
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // Try both formats
    const date1 = new Date(`${c}-${a}-${b}`);
    const date2 = new Date(`${c}-${b}-${a}`);
    
    if (!isNaN(date1.getTime())) {
      return date1.toISOString().split('T')[0];
    }
    if (!isNaN(date2.getTime())) {
      return date2.toISOString().split('T')[0];
    }
  }
  
  return str; // Return as string if can't parse
}

// Normalize a single row
function normalizeRow(row: any, mapping: Record<string, string>): Txn | null {
  const normalized: Partial<Txn> = {};
  
  // Map fields using header mapping
  Object.entries(mapping).forEach(([key, header]) => {
    const value = row[header];
    
    switch (key) {
      case 'date':
        normalized.date = parseDate(value);
        break;
      case 'account':
        normalized.account = String(value || '').trim();
        break;
      case 'category':
        normalized.category = String(value || '').trim();
        break;
      case 'asset':
        normalized.asset = String(value || '').trim();
        break;
      case 'amount':
        normalized.amount = parseAmount(value);
        break;
      case 'currency':
        normalized.currency = String(value || 'EUR').trim();
        break;
      case 'note':
        normalized.note = String(value || '').trim();
        break;
    }
  });
  
  // Validate required fields
  if (!normalized.date || !normalized.account || !normalized.category) {
    return null;
  }
  
  // Set defaults
  return {
    date: normalized.date,
    account: normalized.account,
    category: normalized.category,
    asset: normalized.asset || 'Unknown',
    amount: normalized.amount || 0,
    currency: normalized.currency || 'EUR',
    note: normalized.note || ''
  };
}

// Main normalization function
export function normalizeRows(rows: any[]): Txn[] {
  if (!rows || rows.length === 0) {
    console.warn('[normalize] No rows to normalize');
    return [];
  }
  
  console.info('[normalize] Starting normalization', { inputRows: rows.length });
  
  // Get headers from first row
  const firstRow = rows[0];
  if (!firstRow || typeof firstRow !== 'object') {
    console.error('[normalize] Invalid first row', firstRow);
    return [];
  }
  
  const headers = Object.keys(firstRow);
  console.info('[normalize] Headers found', headers);
  
  // Find header mapping
  const mapping = findHeaderMapping(headers);
  console.info('[normalize] Header mapping', mapping);
  
  // Check for required fields
  const required = ['date', 'account', 'category'];
  const missing = required.filter(field => !mapping[field]);
  
  if (missing.length > 0) {
    console.error('[normalize] Missing required columns', { missing, available: headers });
    throw new Error(`Missing required columns: ${missing.join(', ')}. Available: ${headers.join(', ')}`);
  }
  
  // Normalize each row
  const normalized: Txn[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const normalizedRow = normalizeRow(row, mapping);
    
    if (normalizedRow) {
      normalized.push(normalizedRow);
    }
  }
  
  console.info('[normalize] Normalization complete', { 
    input: rows.length, 
    output: normalized.length,
    dropped: rows.length - normalized.length
  });
  
  return normalized;
}

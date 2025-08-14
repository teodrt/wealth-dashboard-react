import { CategoryId, CATEGORIES, CATEGORY_ALIASES, CATEGORY_IDS } from '../config/categories';

export type RawRow = { 
  Category?: string; 
  Amount?: number | string; 
  Asset?: string; 
  Date?: string; 
  Currency?: string; 
  Account?: string; 
  Notes?: string 
};

export type ParsedRow = { 
  category: CategoryId; 
  amount: number; 
  asset?: string; 
  date?: Date; 
  currency?: string; 
  account?: string; 
  notes?: string 
};

export const STRICT_MODE = false;

// Normalize text: trim, lower, remove accents, collapse spaces
function normalize(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

// Map category input to CategoryId
export function mapCategory(input: string): CategoryId {
  const norm = normalize(input);
  
  // Check official labels first (case-insensitive, emoji ignored)
  for (const c of CATEGORIES) {
    const labelNorm = normalize(c.label);
    const emojiLabelNorm = normalize(`${c.emoji ?? ''} ${c.label}`);
    
    if (norm === labelNorm || norm === emojiLabelNorm) {
      return c.id;
    }
  }
  
  // Check aliases
  if (CATEGORY_ALIASES[norm]) {
    return CATEGORY_ALIASES[norm];
  }
  
  // Fallback
  if (!STRICT_MODE) {
    return 'alternatives';
  }
  
  throw new Error(`Unknown category: "${input}"`);
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
function parseDate(value: any): Date | undefined {
  if (!value) return undefined;
  
  const str = String(value).trim();
  if (!str) return undefined;
  
  // Try to parse various formats
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Handle dd/MM/yyyy and MM/dd/yyyy
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // Try both formats
    const date1 = new Date(`${c}-${a}-${b}`);
    const date2 = new Date(`${c}-${b}-${a}`);
    
    if (!isNaN(date1.getTime())) {
      return date1;
    }
    if (!isNaN(date2.getTime())) {
      return date2;
    }
  }
  
  return undefined;
}

// Parse Excel/CSV file
export async function parseFile(file: File): Promise<ParsedRow[]> {
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (fileExtension === '.csv') {
    return parseCSV(file);
  } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    return parseXLSX(file);
  } else {
    throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

// Parse CSV file
async function parseCSV(file: File): Promise<ParsedRow[]> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const dataRows = lines.slice(1).map(line => line.split(','));
  
  return parseRows(dataRows, headers);
}

// Parse XLSX file
async function parseXLSX(file: File): Promise<ParsedRow[]> {
  const XLSX = (await import('xlsx')).default || (await import('xlsx'));
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  
  if (!workbook.SheetNames.length) {
    throw new Error('No sheets found in workbook');
  }
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length < 2) {
    throw new Error('Excel must have at least a header row and one data row');
  }
  
  const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
  const dataRows = jsonData.slice(1) as any[][];
  
  return parseRows(dataRows, headers);
}

// Parse data rows with headers
function parseRows(dataRows: any[][], headers: string[]): ParsedRow[] {
  const categoryIndex = headers.findIndex(h => 
    normalize(h).includes('category') || normalize(h).includes('categoria')
  );
  const amountIndex = headers.findIndex(h => 
    normalize(h).includes('amount') || normalize(h).includes('importo') || 
    normalize(h).includes('value') || normalize(h).includes('valore')
  );
  const assetIndex = headers.findIndex(h => 
    normalize(h).includes('asset') || normalize(h).includes('titolo') ||
    normalize(h).includes('strumento')
  );
  const dateIndex = headers.findIndex(h => 
    normalize(h).includes('date') || normalize(h).includes('data')
  );
  const currencyIndex = headers.findIndex(h => 
    normalize(h).includes('currency') || normalize(h).includes('valuta')
  );
  const accountIndex = headers.findIndex(h => 
    normalize(h).includes('account') || normalize(h).includes('conto')
  );
  const notesIndex = headers.findIndex(h => 
    normalize(h).includes('notes') || normalize(h).includes('note') ||
    normalize(h).includes('description') || normalize(h).includes('descrizione')
  );
  
  if (categoryIndex === -1) {
    throw new Error('Required column "Category" not found');
  }
  if (amountIndex === -1) {
    throw new Error('Required column "Amount" not found');
  }
  
  const parsed: ParsedRow[] = [];
  const unknownCategories: string[] = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every(cell => !cell)) continue; // Skip empty rows
    
    try {
      const category = mapCategory(row[categoryIndex] || '');
      const amount = parseAmount(row[amountIndex]);
      
      if (amount === 0) continue; // Skip rows with zero amount
      
      parsed.push({
        category,
        amount,
        asset: row[assetIndex] ? String(row[assetIndex]).trim() : undefined,
        date: row[dateIndex] ? parseDate(row[dateIndex]) : undefined,
        currency: row[currencyIndex] ? String(row[currencyIndex]).trim() : 'EUR',
        account: row[accountIndex] ? String(row[accountIndex]).trim() : 'Unknown',
        notes: row[notesIndex] ? String(row[notesIndex]).trim() : undefined
      });
      
      // Track unknown categories for reporting
      if (category === 'alternatives' && row[categoryIndex]) {
        const input = String(row[categoryIndex]).trim();
        if (!unknownCategories.includes(input)) {
          unknownCategories.push(input);
        }
      }
    } catch (error) {
      if (STRICT_MODE) {
        throw error;
      }
      // In non-strict mode, skip problematic rows
      console.warn(`Skipping row ${i + 1}:`, error);
    }
  }
  
  // Log unknown categories for review
  if (unknownCategories.length > 0) {
    console.info('Categories mapped to alternatives:', unknownCategories);
  }
  
  return parsed;
}

// Aggregate totals by category
export function aggregateTotals(rows: ParsedRow[]): Record<CategoryId, number> {
  const totals = Object.fromEntries(CATEGORY_IDS.map(id => [id as CategoryId, 0])) as Record<CategoryId, number>;
  
  for (const row of rows) {
    totals[row.category] += row.amount || 0;
  }
  
  return totals;
}

// Calculate net worth total
export function netWorthTotal(totals: Record<CategoryId, number>): number {
  return CATEGORY_IDS.reduce((sum, id) => sum + (totals[id as CategoryId] || 0), 0);
}

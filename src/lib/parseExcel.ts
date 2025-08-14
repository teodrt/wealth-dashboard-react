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
  year: number;
  month: string | number;
  master: CategoryId;
  sub: string;
  amount: number;
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
function parseAmount(value: any): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (!value) return null;
  
  const str = String(value).trim();
  if (!str) return null;
  
  // Remove currency symbols and spaces
  let cleaned = str.replace(/[€$£¥\s]/g, '');
  
  // Handle parentheses for negative numbers
  const isNegative = cleaned.includes('(') && cleaned.includes(')');
  cleaned = cleaned.replace(/[()]/g, '');
  
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
  if (isNaN(parsed)) return null;
  
  return isNegative ? -parsed : parsed;
}

// Parse month (convert to number if possible)
function parseMonth(value: any): string | number {
  if (typeof value === 'number') {
    if (value >= 1 && value <= 12) return value;
    return String(value);
  }
  
  const str = String(value).trim();
  if (!str) return '';
  
  // Try to parse month names
  const monthMap: Record<string, number> = {
    'jan': 1, 'january': 1, 'gen': 1, 'gennaio': 1,
    'feb': 2, 'february': 2, 'febbraio': 2,
    'mar': 3, 'march': 3, 'marzo': 3,
    'apr': 4, 'april': 4, 'aprile': 4,
    'may': 5, 'maggio': 5,
    'jun': 6, 'june': 6, 'giu': 6, 'giugno': 6,
    'jul': 7, 'july': 7, 'lug': 7, 'luglio': 7,
    'aug': 8, 'august': 8, 'ago': 8, 'agosto': 8,
    'sep': 9, 'september': 9, 'set': 9, 'settembre': 9,
    'oct': 10, 'october': 10, 'ott': 10, 'ottobre': 10,
    'nov': 11, 'november': 11, 'novembre': 11,
    'dec': 12, 'december': 12, 'dic': 12, 'dicembre': 12
  };
  
  const normalized = str.toLowerCase();
  if (monthMap[normalized]) {
    return monthMap[normalized];
  }
  
  return str;
}

// Parse Excel/CSV file in matrix format
export async function parseFile(
  file: File,
  options: { onProgress?: (ratio: number) => void } = {}
): Promise<ParsedRow[]> {
  const { onProgress } = options;
  try {
    const name = (file?.name || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot + 1) : '';
    console.info('[parse] ext', file?.name, file?.type, ext);

    if (ext === 'csv') {
      onProgress?.(0.02);
      const rows = await parseCSV(file, { onProgress });
      if (!rows.length) throw new Error('No valid rows parsed from CSV');
      onProgress?.(1);
      return rows;
    }
    if (ext === 'xlsx' || ext === 'xls') {
      onProgress?.(0.02);
      const rows = await parseXLSX(file, { onProgress });
      if (!rows.length) throw new Error('No valid rows parsed from Excel');
      onProgress?.(1);
      return rows;
    }
    throw new Error(`Unsupported file type: .${ext}. Accepted: .csv, .xlsx, .xls`);
  } catch (err: any) {
    console.error('[parse] failed', err);
    throw err;
  }
}

// Parse CSV file in matrix format
async function parseCSV(
  file: File, 
  options: { onProgress?: (ratio: number) => void } = {}
): Promise<ParsedRow[]> {
  const { onProgress } = options;
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 3) {
    throw new Error('CSV must have at least 3 rows (headers + data)');
  }
  
  const dataRows = lines.map(line => line.split(',').map(cell => cell.trim()));
  
  return parseMatrix(dataRows, { onProgress });
}

// Parse XLSX file in matrix format
async function parseXLSX(
  file: File, 
  options: { onProgress?: (ratio: number) => void } = {}
): Promise<ParsedRow[]> {
  const { onProgress } = options;
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
  
  if (jsonData.length < 3) {
    throw new Error('Excel must have at least 3 rows (headers + data)');
  }
  
  return parseMatrix(jsonData as any[][], { onProgress });
}

// Parse matrix data with the specific layout
function parseMatrix(
  dataRows: any[][], 
  options: { onProgress?: (ratio: number) => void } = {}
): ParsedRow[] {
  const { onProgress } = options;
  
  // Validate minimum structure
  if (dataRows.length < 3) {
    throw new Error('Matrix must have at least 3 rows');
  }
  
  // Row 1: Master categories (C1, D1, E1, ...)
  const masterRow = dataRows[0] || [];
  // Row 2: Sub-categories (C2, D2, E2, ...)
  const subRow = dataRows[1] || [];
  // Row 3+: Data rows (A3, B3, C3, ...)
  const dataRowsFrom3 = dataRows.slice(2);
  
  // Validate year/month columns exist
  if (!masterRow[0] || !masterRow[1]) {
    throw new Error('Missing Year (A3...) and/or Month (B3...) rows.');
  }
  
  // Find the first data column (should be C, index 2)
  let firstDataCol = 2;
  while (firstDataCol < masterRow.length && !masterRow[firstDataCol]) {
    firstDataCol++;
  }
  
  if (firstDataCol >= masterRow.length) {
    throw new Error('No category columns found starting from column C');
  }
  
  // Extract master categories and validate
  const masters: CategoryId[] = [];
  const subs: string[] = [];
  const warnings: string[] = [];
  const invalidHeaders: string[] = [];
  
  for (let col = firstDataCol; col < masterRow.length; col++) {
    const masterHeader = masterRow[col];
    const subHeader = subRow[col];
    
    if (!masterHeader) continue; // Skip empty columns
    
    try {
      const masterCategory = mapCategory(masterHeader);
      masters.push(masterCategory);
      subs.push(subHeader || 'Unknown');
      
      if (masterCategory === 'alternatives' && STRICT_MODE === false) {
        warnings.push(`Column ${String.fromCharCode(65 + col)}: "${masterHeader}" mapped to ALTERNATIVES`);
      }
    } catch (error) {
      if (STRICT_MODE) {
        throw new Error(`Invalid master category in column ${String.fromCharCode(65 + col)}: "${masterHeader}"`);
      } else {
        masters.push('alternatives');
        subs.push(subHeader || 'Unknown');
        invalidHeaders.push(masterHeader);
        warnings.push(`Column ${String.fromCharCode(65 + col)}: "${masterHeader}" mapped to ALTERNATIVES`);
      }
    }
  }
  
  if (masters.length === 0) {
    throw new Error('No valid master categories found');
  }
  
  // Parse data rows
  const parsed: ParsedRow[] = [];
  const totalCells = dataRowsFrom3.length * masters.length;
  let processedCells = 0;
  
  for (let rowIndex = 0; rowIndex < dataRowsFrom3.length; rowIndex++) {
    const row = dataRowsFrom3[rowIndex];
    if (!row || row.length < 2) continue; // Skip rows without year/month
    
    const year = parseInt(String(row[0] || ''), 10);
    const month = parseMonth(row[1]);
    
    if (isNaN(year) || !month) continue; // Skip invalid year/month
    
    for (let colIndex = 0; colIndex < masters.length; colIndex++) {
      const dataCol = firstDataCol + colIndex;
      const amount = parseAmount(row[dataCol]);
      
      if (amount !== null) {
        parsed.push({
          year,
          month,
          master: masters[colIndex],
          sub: subs[colIndex],
          amount
        });
      } else if (row[dataCol] !== undefined && row[dataCol] !== '') {
        warnings.push(`Invalid amount at ${String.fromCharCode(65 + dataCol)}${rowIndex + 3}: "${row[dataCol]}"`);
      }
      
      processedCells++;
      
      // Report progress every 100 cells or at the end
      if (onProgress && (processedCells % 100 === 0 || processedCells === totalCells)) {
        onProgress(Math.min(0.98, processedCells / totalCells));
      }
    }
  }
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('Parsing warnings:', warnings);
  }
  
  if (invalidHeaders.length > 0) {
    console.warn('Invalid headers mapped to alternatives:', invalidHeaders);
  }
  
  if (!parsed.length) {
    throw new Error('No valid rows parsed');
  }
  return parsed;
}

// Aggregate totals by master category
export function aggregateTotals(rows: ParsedRow[]): Record<CategoryId, number> {
  const totals = Object.fromEntries(CATEGORY_IDS.map(id => [id as CategoryId, 0])) as Record<CategoryId, number>;
  
  for (const row of rows) {
    totals[row.master] += row.amount || 0;
  }
  
  return totals;
}

// Calculate net worth total
export function netWorthTotal(totals: Record<CategoryId, number>): number {
  return CATEGORY_IDS.reduce((sum, id) => sum + (totals[id as CategoryId] || 0), 0);
}

// Get unique sub-categories
export function getUniqueSubs(rows: ParsedRow[]): string[] {
  const subs = new Set<string>();
  for (const row of rows) {
    if (row.sub) subs.add(row.sub);
  }
  return Array.from(subs).sort();
}

// Get unique years
export function getUniqueYears(rows: ParsedRow[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    if (row.year) years.add(row.year);
  }
  return Array.from(years).sort();
}

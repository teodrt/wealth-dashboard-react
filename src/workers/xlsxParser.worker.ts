// XLSX Parser Worker - Structured Message Contract
// Sends: progress, schema, done, error messages

interface WorkerMessage {
  type: 'parse';
  buffer: ArrayBuffer;
}

interface ProgressMessage {
  type: 'progress';
  value: number;
}

interface SchemaMessage {
  type: 'schema';
  headers: string[];
  sheet: string;
  rowSample: any[];
}

interface DoneMessage {
  type: 'done';
  rows: any[];
  rowCount: number;
  headers: string[];
  durationMs: number;
}

interface ErrorMessage {
  type: 'error';
  message: string;
  stack?: string;
}

type OutgoingMessage = ProgressMessage | SchemaMessage | DoneMessage | ErrorMessage;

let progressInterval: number | null = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const startTime = Date.now();
  
  try {
    if (e.data?.type !== 'parse') return;
    
    const buffer: ArrayBuffer = e.data.buffer;
    
    // Import XLSX
    const XLSX = (await import('xlsx')).default || (await import('xlsx'));
    
    // Progress nudger
    let progress = 0;
    progressInterval = setInterval(() => {
      progress = Math.min(progress + 2, 95);
      (self as any).postMessage({ type: 'progress', value: progress } as ProgressMessage);
    }, 200);
    
    // Parse workbook
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    
    // Find active sheet (prefer "Transactions", else first)
    const sheetNames = wb.SheetNames;
    let activeSheet = sheetNames.find(name => 
      name.toLowerCase().includes('transaction') || 
      name.toLowerCase().includes('transazioni')
    ) || sheetNames[0];
    
    if (!activeSheet) {
      throw new Error('No sheets found in workbook');
    }
    
    const ws = wb.Sheets[activeSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // Extract headers and data
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as any[][];
    
    // Filter out completely empty rows
    const nonEmptyRows = dataRows.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );
    
    // Convert to objects
    const rows = nonEmptyRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    // Send schema message
    const rowSample = rows.slice(0, 5);
    (self as any).postMessage({
      type: 'schema',
      headers,
      sheet: activeSheet,
      rowSample
    } as SchemaMessage);
    
    // Send progress 100%
    (self as any).postMessage({ type: 'progress', value: 100 } as ProgressMessage);
    
    // Send done message
    const durationMs = Date.now() - startTime;
    (self as any).postMessage({
      type: 'done',
      rows,
      rowCount: rows.length,
      headers,
      durationMs
    } as DoneMessage);
    
  } catch (err: any) {
    // Clear progress interval on error
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    (self as any).postMessage({
      type: 'error',
      message: err?.message || String(err),
      stack: err?.stack || ''
    } as ErrorMessage);
  }
};

export {};

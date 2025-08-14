// Robust XLSX Parser Worker
self.onmessage = async (e: MessageEvent) => {
  try {
    if (e.data?.type !== 'parse') return;
    
    const buffer: ArrayBuffer = e.data.buffer;
    
    // Lazy import XLSX inside worker
    // @ts-ignore
    const XLSX = (await import('xlsx')).default || (await import('xlsx'));
    
    // Progress nudger (tick to 99 while parsing)
    let p = 0;
    const nudger = setInterval(() => {
      p = Math.min(p + 1, 99);
      (self as any).postMessage({ type: 'progress', value: p });
    }, 300);
    
    // Parse the workbook
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    
    if (!wb.SheetNames.length) {
      throw new Error('No sheets found in workbook');
    }
    
    const firstSheet = wb.SheetNames[0];
    const worksheet = wb.Sheets[firstSheet];
    
    if (!worksheet) {
      throw new Error(`Sheet "${firstSheet}" not found`);
    }
    
    // Convert to JSON with proper defaults
    const rows = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      header: 1,
      raw: false
    });
    
    // Clear the nudger
    clearInterval(nudger);
    
    // Send completion
    (self as any).postMessage({ type: 'progress', value: 100 });
    (self as any).postMessage({ 
      type: 'done', 
      rows,
      sheetName: firstSheet,
      totalRows: rows.length
    });
    
  } catch (err: any) {
    (self as any).postMessage({ 
      type: 'error', 
      message: err?.message || String(err), 
      stack: err?.stack || '',
      name: err?.name || 'UnknownError'
    });
  }
};

export {}; // Make it a module

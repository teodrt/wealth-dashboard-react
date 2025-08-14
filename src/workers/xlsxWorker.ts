import * as XLSX from 'xlsx';

interface WorkerMessage {
  type: 'parse' | 'cancel';
  data?: any;
  id?: string;
}

interface ParseResult {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  data?: any;
  error?: string;
}

let currentJob: { id: string; cancelled: boolean } | null = null;

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, data, id } = e.data;

  if (type === 'parse') {
    if (currentJob) {
      currentJob.cancelled = true;
    }
    
    currentJob = { id: id || 'default', cancelled: false };
    parseExcelFile(data, currentJob);
  } else if (type === 'cancel') {
    if (currentJob) {
      currentJob.cancelled = true;
    }
  }
};

function parseExcelFile(fileData: ArrayBuffer, job: { id: string; cancelled: boolean }) {
  try {
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      self.postMessage({
        type: 'error',
        error: 'No worksheet found'
      } as ParseResult);
      return;
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r - range.s.r + 1;
    
    if (totalRows === 0) {
      self.postMessage({
        type: 'complete',
        data: []
      } as ParseResult);
      return;
    }

    // Chunked parsing with progress updates
    const chunkSize = Math.max(1, Math.floor(totalRows / 20)); // 20 progress updates
    const rows: any[] = [];
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      if (job.cancelled) {
        return;
      }

      const rowData: any = {};
      let hasData = false;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          hasData = true;
          const colName = XLSX.utils.encode_col(col);
          rowData[colName] = cell.v;
        }
      }

      if (hasData) {
        rows.push(rowData);
      }

      // Progress update every chunk
      if (row % chunkSize === 0 || row === range.e.r) {
        const progress = Math.min(99, Math.floor((row - range.s.r + 1) / totalRows * 99));
        self.postMessage({
          type: 'progress',
          progress
        } as ParseResult);
      }
    }

    if (job.cancelled) {
      return;
    }

    // Final progress update
    self.postMessage({
      type: 'progress',
      progress: 99
    } as ParseResult);

    // Small delay to show 99% progress
    setTimeout(() => {
      if (!job.cancelled) {
        self.postMessage({
          type: 'complete',
          data: rows
        } as ParseResult);
      }
    }, 100);

  } catch (error) {
    if (!job.cancelled) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ParseResult);
    }
  }
}

// Debug logger with console output and ring buffer
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

const MAX_LOGS = 200;
let logBuffer: LogEntry[] = [];

// Initialize global log buffer
if (typeof window !== 'undefined') {
  (window as any).__UPLOAD_LOGS__ = logBuffer;
}

function addToBuffer(level: LogEntry['level'], message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  
  logBuffer.push(entry);
  
  // Keep only last MAX_LOGS entries
  if (logBuffer.length > MAX_LOGS) {
    logBuffer = logBuffer.slice(-MAX_LOGS);
  }
  
  // Update global reference
  if (typeof window !== 'undefined') {
    (window as any).__UPLOAD_LOGS__ = logBuffer;
  }
}

function shouldLog(): boolean {
  return true; // Always log for now
}

export function debug(message: string, data?: any) {
  if (shouldLog()) {
    console.debug(`[DEBUG] ${message}`, data);
    addToBuffer('debug', message, data);
  }
}

export function info(message: string, data?: any) {
  if (shouldLog()) {
    console.info(`[INFO] ${message}`, data);
    addToBuffer('info', message, data);
  }
}

export function warn(message: string, data?: any) {
  if (shouldLog()) {
    console.warn(`[WARN] ${message}`, data);
    addToBuffer('warn', message, data);
  }
}

export function error(message: string, data?: any) {
  if (shouldLog()) {
    console.error(`[ERROR] ${message}`, data);
    addToBuffer('error', message, data);
  }
}

export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogs() {
  logBuffer = [];
  if (typeof window !== 'undefined') {
    (window as any).__UPLOAD_LOGS__ = logBuffer;
  }
}

// Enable debug mode globally for testing
if (typeof window !== 'undefined') {
  (window as any).__DEBUG_MODE__ = true;
}

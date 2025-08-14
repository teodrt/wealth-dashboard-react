import React, { useState, useRef, useCallback } from 'react';
import { Upload as UploadIcon, X, AlertCircle } from 'lucide-react';
import GlassCard from './GlassCard';
import ErrorBanner from './system/ErrorBanner';
import { debug, info, warn, error } from '../lib/debug';

interface UploaderProps {
  onDataParsed: (data: any[]) => void;
  onError?: (error: string) => void;
}

export default function Uploader({ onDataParsed, onError }: UploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isUploadingRef = useRef(false);

  const maxFileSizeMB = 25; // Default max file size
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

  const resetState = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setErrorMessage('');
    setErrorDetails('');
    setUploadStatus('');
    isUploadingRef.current = false;
    
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showError = useCallback((message: string, details?: string) => {
    error('Upload error', { message, details });
    setErrorMessage(message);
    setErrorDetails(details || '');
    resetState();
    onError?.(message);
  }, [resetState, onError]);

  const parseWithFallback = useCallback(async (buffer: ArrayBuffer) => {
    info('Starting fallback parsing');
    setUploadStatus('Parsing with fallback...');
    
    try {
      // Lazy import XLSX
      const XLSX = (await import('xlsx')).default || (await import('xlsx'));
      
      // Parse in chunks to keep UI responsive
      const uint8Array = new Uint8Array(buffer);
      const workbook = XLSX.read(uint8Array, { type: 'array' });
      
      if (!workbook.SheetNames.length) {
        throw new Error('No sheets found in workbook');
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }
      
      setProgress(20);
      await new Promise(r => requestAnimationFrame(r));
      
      // Convert to JSON with progress updates
      const rows = XLSX.utils.sheet_to_json(worksheet, { 
        defval: '',
        header: 1,
        raw: false
      });
      
      setProgress(60);
      await new Promise(r => requestAnimationFrame(r));
      
      // Process rows in chunks
      const processedRows = [];
      const chunkSize = 100;
      
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        processedRows.push(...chunk);
        
        if (i % (chunkSize * 5) === 0) {
          setProgress(60 + Math.floor((i / rows.length) * 30));
          await new Promise(r => requestAnimationFrame(r));
        }
      }
      
      setProgress(100);
      setUploadStatus('Parsing complete');
      
      info('Fallback parsing completed', { rows: processedRows.length });
      onDataParsed(processedRows);
      
    } catch (err: any) {
      error('Fallback parsing failed', err);
      showError('Fallback parsing failed', err?.message || String(err));
    }
  }, [showError, onDataParsed]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (isUploadingRef.current) {
      warn('Upload already in progress');
      return;
    }

    debug('File upload started', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });

    // Validate file type
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      showError('Invalid file type', `Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSizeBytes) {
      showError(
        'File too large', 
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${maxFileSizeMB}MB)`
      );
      return;
    }

    setIsUploading(true);
    isUploadingRef.current = true;
    setProgress(0);
    setErrorMessage('');
    setErrorDetails('');
    setUploadStatus('Reading file...');

    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      setProgress(5);
      setUploadStatus('Starting parser...');

      // Start timeout for fallback
      timeoutRef.current = setTimeout(() => {
        warn('Worker timeout, switching to fallback');
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        parseWithFallback(buffer);
      }, 5000);

      // Temporarily use fallback parsing only
      parseWithFallback(buffer);

    } catch (err: any) {
      error('File reading failed', err);
      showError('Failed to read file', err?.message || String(err));
    }
  }, [maxFileSizeBytes, showError, parseWithFallback, onDataParsed]);

  const handleCancel = useCallback(() => {
    info('Upload cancelled by user');
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    resetState();
  }, [resetState]);

  return (
    <div className="uploader-container">
      <GlassCard className="upload-section">
        <h3>
          <UploadIcon size={16} /> Upload Excel File
        </h3>
        
        <div className="upload-controls">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              // Reset input
              e.target.value = '';
            }}
            className="file-input"
            disabled={isUploading}
          />
          
          {isUploading && (
            <button 
              className="cancel-button"
              onClick={handleCancel}
              disabled={!isUploading}
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        {isUploading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">
              {uploadStatus} {progress > 0 ? `(${progress}%)` : ''}
            </div>
          </div>
        )}

        <div className="upload-info">
          <small>
            Supported formats: .xlsx, .xls, .csv | Max size: {maxFileSizeMB}MB
          </small>
        </div>
      </GlassCard>

      <ErrorBanner
        message={errorMessage}
        details={errorDetails}
        onDismiss={() => {
          setErrorMessage('');
          setErrorDetails('');
        }}
      />
    </div>
  );
}

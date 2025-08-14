'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload as UploadIcon, X, AlertCircle } from 'lucide-react';
import GlassCard from './GlassCard';
import ErrorBanner from './system/ErrorBanner';
import { debug, info, warn, error } from '../lib/debug';
import { parseFile } from '../lib/parseExcel';
import { useDataStore } from '../store/dataStore';

interface UploaderProps {
  onDataParsed: (data: any[]) => void;
  onError?: (error: string) => void;
}

export default function Uploader({ onDataParsed, onError }: UploaderProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  
  const fileRef = useRef<File | null>(null);
  const { setRaw } = useDataStore();
  
  // Monotonic progress that never goes backwards
  const bump = useCallback((p: number) => {
    setProgress(prev => Math.max(prev, Math.min(99, p)));
  }, []);

  const maxFileSizeMB = 25; // Default max file size
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

  const resetState = useCallback(() => {
    setIsBusy(false);
    setProgress(0);
    setErrorMessage(null);
    setUploadStatus('');
    setLastUploadTime(null);
    fileRef.current = null;
  }, []);

  const showError = useCallback((message: string) => {
    error('Upload error', { message });
    setErrorMessage(message);
    onError?.(message);
  }, [onError]);

  // Robust upload handler with phase-based progress
  const onFileSelected = useCallback(async (file: File) => {
    console.info('[upload] file selected', file?.name, file?.size, file?.type);
    try {
      // Prevent double-processing
      if (fileRef.current?.name === file.name && isBusy) {
        return;
      }
      
      setErrorMessage(null);
      setIsBusy(true);
      setProgress(0);
      fileRef.current = file;
      
      // Phase 1: Read file (0-25%)
      bump(10);
      setUploadStatus('Reading file...');
      const arrayBuffer = await file.arrayBuffer();
      bump(25);
      
      // Phase 2: Parse with progress (25-75%)
      setUploadStatus('Parsing file...');
      const parsedRows = await parseFile(file, {
        onProgress: (ratio: number) => {
          const progressValue = 25 + Math.floor(50 * Math.max(0, Math.min(1, ratio)));
          bump(progressValue);
        }
      });
      console.info('[upload] parsed', { rows: parsedRows.length });
      
      if (parsedRows.length === 0) {
        throw new Error('No valid data found - all rows were empty or missing required fields');
      }
      
      bump(75);
      
      // Phase 3: Commit to store (75-90%)
      setUploadStatus('Processing data...');
      // Convert ParsedRow -> PortfolioPosition[]
      const portfolioPositions = parsedRows.map((row: any) => {
        const y = Number(row.year);
        const m = typeof row.month === 'number' ? row.month : parseInt(String(row.month), 10) || 1;
        const iso = `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-01`;
        return {
          date: iso,
          account: row.sub || 'Unknown',
          category: row.master || 'alternatives',
          assetClass: 'Other',
          currency: 'EUR',
          value: Number(row.amount || 0),
        };
      });
      setRaw(portfolioPositions);
      console.info('[upload] committed', { rows: portfolioPositions.length });
      bump(90);
      
      // Phase 4: Finalize and wait for next paint (90-99%)
      setUploadStatus('Finalizing...');
      await Promise.resolve(); // Wait for React to commit state
      bump(99);
      
      // Phase 5: Success (100%)
      const alternativesCount = parsedRows.filter(row => row.master === 'alternatives').length;
      const uniqueYears = [...new Set(parsedRows.map(row => row.year))].sort();
      const uniqueSubs = [...new Set(parsedRows.map(row => row.sub))].sort();
      
      if (alternativesCount > 0) {
        setUploadStatus(`Imported ${parsedRows.length} data points (${alternativesCount} mapped to Alternatives) - Years: ${uniqueYears.join(', ')} - Subs: ${uniqueSubs.slice(0, 3).join(', ')}${uniqueSubs.length > 3 ? '...' : ''}`);
      } else {
        setUploadStatus(`Imported ${parsedRows.length} data points - Years: ${uniqueYears.join(', ')} - Subs: ${uniqueSubs.slice(0, 3).join(', ')}${uniqueSubs.length > 3 ? '...' : ''}`);
      }
      
      setProgress(100);
      setLastUploadTime(new Date().toLocaleTimeString());
      
      // Call legacy callback for compatibility
      onDataParsed(parsedRows);
      
      // Keep progress at 100% for 800ms then fade
      setTimeout(() => {
        if (progress === 100) {
          setProgress(0);
          setUploadStatus('');
        }
      }, 800);
      
    } catch (err: any) {
      console.error('UPLOAD/PARSE ERROR', err);
      setErrorMessage(err?.message || 'Failed to parse file. Accepted: .csv, .xlsx, .xls');
      // Do NOT reset progress to 0 - leave bar where it got to
    } finally {
      setIsBusy(false);
    }
  }, [bump, setRaw, onDataParsed, progress]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (isBusy) {
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
      showError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSizeBytes) {
      showError(
        `File too large. File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${maxFileSizeMB}MB)`
      );
      return;
    }

    // Start upload process
    await onFileSelected(file);
  }, [isBusy, maxFileSizeBytes, showError, onFileSelected]);

  const handleCancel = useCallback(() => {
    info('Upload cancelled by user');
    resetState();
  }, [resetState]);

  return (
    <div className="uploader-container">
              <div className="upload-section">
          <h3 className="upload-title">
            <UploadIcon size={16} /> Upload Excel File
          </h3>
        
        <div className="upload-controls">
          <label className="file-input-wrapper">
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
              disabled={isBusy}
            />
            <span className="file-input-text">
              {isBusy ? 'Processing...' : 'Choose Excel/CSV file'}
            </span>
          </label>
          
          {isBusy && (
            <button 
              className="cancel-button"
              onClick={handleCancel}
              disabled={!isBusy}
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        {(import.meta as any).env?.MODE !== 'production' && (
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-outline"
              onClick={async () => {
                try {
                  setIsBusy(true);
                  setUploadStatus('Loading mock CSV...');
                  const res = await fetch('/mocks/sample-portfolio.csv');
                  const text = await res.text();
                  const blob = new Blob([text], { type: 'text/csv' });
                  const mockFile = new File([blob], 'sample-portfolio.csv', { type: 'text/csv' });
                  await onFileSelected(mockFile);
                } catch (e: any) {
                  setErrorMessage(e?.message || 'Failed to load mock CSV');
                }
              }}
            >
              Load Mock CSV (dev)
            </button>
          </div>
        )}

        {isBusy && (
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

        {lastUploadTime && !isBusy && (
          <div className="upload-success">
            <small>Last upload: {lastUploadTime}</small>
          </div>
        )}

        <div className="upload-info">
          <small>
            Supported formats: .xlsx, .xls, .csv | Max size: {maxFileSizeMB}MB
          </small>
        </div>
      </div>

      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          details=""
          onDismiss={() => setErrorMessage(null)}
        />
      )}
      
      {/* Debug Panel */}
      {true && (
        <div className="debug-panel">
          <h4>Debug Info</h4>
          <div className="debug-section">
            <strong>Current Progress:</strong>
            <span>{progress}%</span>
          </div>
          <div className="debug-section">
            <strong>Status:</strong>
            <span>{uploadStatus}</span>
          </div>
          <div className="debug-section">
            <strong>Store Count:</strong>
            <span>{useDataStore.getState().getCount()} rows</span>
          </div>
        </div>
      )}
    </div>
  );
}

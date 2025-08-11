import React, { useRef, useState, useEffect } from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Row {
  Date: string;
  Account: string;
  Category?: string;
  AssetClass?: string;
  Currency?: string;
  Value: number;
}

export default function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL("./workers/xlsxWorker.ts", import.meta.url), { type: "module" });
    workerRef.current.onmessage = (e: MessageEvent<any>) => {
      if (e.data.type === "progress") {
        setProgress(e.data.value);
      } else if (e.data.type === "result") {
        setLoading(false);
        if (e.data.ok && e.data.rows) {
          setRows(e.data.rows);
        } else {
          alert(e.data.error || "Unknown error");
        }
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  function handleFile(file: File) {
    setRows([]);
    setProgress(0);
    setLoading(true);
    file.arrayBuffer().then((buf) => {
      workerRef.current?.postMessage({ buffer: buf, name: file.name });
    });
  }

  return (
    <div className="container">
      <header className="hero">
        <div className="hero-panel glass">
          <h1 className="hero-title">Wealth Dashboard</h1>
          <p className="hero-copy">Upload your Excel/CSV to analyze balances and trends instantly.</p>
          <div className="hero-kpis">
            <div>
              <div className="kpi-label">Rows</div>
              <div className="kpi-value">{rows.length}</div>
            </div>
            <div>
              <div className="kpi-label">Progress</div>
              <div className="kpi-value">{progress}%</div>
            </div>
            <div>
              <div className="kpi-label">Status</div>
              <div className="kpi-value">{loading ? "Loading..." : "Idle"}</div>
            </div>
          </div>
        </div>
        <div className="hero-media">
          <img src="https://images.unsplash.com/photo-1649972904344-3f37aeee11c6?auto=format&fit=crop&w=1200&q=80" alt="Finance" />
        </div>
      </header>

      <section style={{ marginTop: 32 }}>
        <label className="upload" htmlFor="file">
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Upload />
              <span>Click or drop file</span>
            </>
          )}
        </label>
        <input
          id="file"
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
        />
        {progress > 0 && progress < 100 && (
          <div className="progress" style={{ marginTop: 8 }}>
            <div style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {rows.length > 0 && (
          <motion.section
            className="card"
            style={{ marginTop: 32 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h3>
              <FileSpreadsheet /> Data Preview
            </h3>
            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Category</th>
                    <th>Asset Class</th>
                    <th>Currency</th>
                    <th style={{ textAlign: "right" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td>{r.Date}</td>
                      <td>{r.Account}</td>
                      <td>{r.Category}</td>
                      <td>{r.AssetClass}</td>
                      <td>{r.Currency}</td>
                      <td style={{ textAlign: "right" }}>{r.Value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 100 && (
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
                Showing first 100 rows of {rows.length}
              </p>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

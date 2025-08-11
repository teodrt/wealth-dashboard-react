import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

export type BalanceRow = {
  Date: string;
  Account: string;
  Category: string;
  AssetClass: string;
  Currency: string;
  Value: number;
};

function todayISO() {
  const d = new Date(); d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

export default function InputPage({
  initial,
  onSave
}: {
  initial: BalanceRow[];
  onSave: (rows: BalanceRow[]) => void;
}) {
  const [rows, setRows] = useState<BalanceRow[]>(initial ?? []);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { setRows(initial ?? []); }, [initial]);

  const [draft, setDraft] = useState<BalanceRow>({
    Date: todayISO(),
    Account: "Manual",
    Category: "",
    AssetClass: "Other",
    Currency: "EUR",
    Value: 0
  });

  const cats = useMemo(() => Array.from(new Set(rows.map(r => r.Category))).sort(), [rows]);

  function addRow() {
    if (!draft.Category.trim()) { setMsg("Inserisci un nome categoria."); return; }
    const val = Number(draft.Value);
    if (isNaN(val)) { setMsg("Il valore deve essere numerico."); return; }
    const r: BalanceRow = { ...draft, Value: val };
    setRows(prev => [r, ...prev]);
    setDraft({ ...draft, Category: "", Value: 0 });
    setMsg(null);
  }

  function removeAt(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function saveAll() {
    try {
      localStorage.setItem("wd_rows_v21", JSON.stringify(rows));
      onSave(rows);
      setMsg("Salvato! Grafici aggiornati.");
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsg("Errore salvataggio.");
    }
  }

  return (
    <div className="card">
      <h3 style={{display:"flex",alignItems:"center",gap:8}}>
        <Plus size={16}/> Inserimento manuale dati
      </h3>

      <div className="controls" style={{marginTop:12}}>
        <input className="input" type="date" value={draft.Date}
          onChange={(e)=>setDraft({...draft, Date:e.target.value})} />
        <input className="input" placeholder="Account (opzionale)" value={draft.Account}
          onChange={(e)=>setDraft({...draft, Account:e.target.value})} />
        <input className="input" placeholder="Categoria (es. equity casa1)" value={draft.Category}
          list="cats" onChange={(e)=>setDraft({...draft, Category:e.target.value})} />
        <datalist id="cats">{cats.map(c=> <option key={c} value={c} />)}</datalist>

        <select className="select" value={draft.AssetClass}
          onChange={(e)=>setDraft({...draft, AssetClass:e.target.value})}>
          {["Cash","Equity","Bond","Fund","Crypto","Real Estate","Loan","Other"].map(x=>
            <option key={x} value={x}>{x}</option>
          )}
        </select>

        <select className="select" value={draft.Currency}
          onChange={(e)=>setDraft({...draft, Currency:e.target.value})}>
          {["EUR","USD","GBP","CHF"].map(x=> <option key={x} value={x}>{x}</option>)}
        </select>

        <input className="input" type="number" step="0.01" placeholder="Valore"
          value={draft.Value} onChange={(e)=>setDraft({...draft, Value:e.target.value as any})} />

        <button className="btn" onClick={addRow} style={{justifySelf:"start",display:"inline-flex",alignItems:"center",gap:8}}>
          <Plus size={14}/> Aggiungi riga
        </button>
      </div>

      {msg && <div className="badge" style={{marginTop:10}}>{msg}</div>}

      <div style={{marginTop:16, overflowX:"auto"}}>
        <table>
          <thead>
            <tr>
              <th style={{whiteSpace:"nowrap"}}>Date</th>
              <th>Account</th>
              <th>Categoria</th>
              <th>AssetClass</th>
              <th>Currency</th>
              <th style={{textAlign:"right"}}>Valore</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td>{r.Date}</td>
                <td>{r.Account}</td>
                <td>{r.Category}</td>
                <td>{r.AssetClass}</td>
                <td>{r.Currency}</td>
                <td style={{textAlign:"right"}}>{Number(r.Value).toLocaleString()}</td>
                <td style={{textAlign:"right"}}>
                  <button className="btn" onClick={()=>removeAt(i)} title="Elimina" style={{padding:"4px 8px"}}>
                    <Trash2 size={14}/>
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={7} className="subtle">Nessuna riga ancora. Aggiungi con il form sopra.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:12, display:"flex", gap:8, flexWrap:"wrap"}}>
        <button className="btn" onClick={saveAll} style={{display:"inline-flex",alignItems:"center",gap:8}}>
          <Save size={14}/> Salva & usa nei grafici
        </button>
        <button className="btn" onClick={()=>{ setRows([]); }} style={{display:"inline-flex",alignItems:"center",gap:8}}>
          Svuota tabella
        </button>
      </div>
    </div>
  );
}

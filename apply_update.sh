set -e

echo "[1/5] Scrivo worker con progress a chunk..."
mkdir -p src/workers
cat > src/workers/xlsxWorker.ts <<'EOF'
import * as XLSX from "xlsx";

export type ParsedRow = {
  Date: string;
  Account: string;
  Category?: string;
  AssetClass?: string;
  Currency?: string;
  Value: number;
};

const MONTHS: Record<string, number> = {
  "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
  "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12
};

function normMonth(m: any): number | null {
  if (m == null) return null;
  const s = String(m).trim().toLowerCase().replace(/\s+/g, "");
  const s2 = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return MONTHS[s2 as keyof typeof MONTHS] || null;
}

function parseItNumber(v: any): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || s === "-") return null;
  s = s.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

type Msg =
  | { type: "progress"; value: number }
  | { type: "result"; ok: boolean; rows?: ParsedRow[]; error?: string };

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer; name: string }>) => {
  try {
    const buffer = e.data.buffer;
    const name = e.data.name;

    (self as any).postMessage({ type: "progress", value: 1 } as Msg);

    const isCSV = /\.csv$/i.test(name);
    let wb: XLSX.WorkBook;
    if (isCSV) {
      const text = new TextDecoder().decode(new Uint8Array(buffer));
      wb = XLSX.read(text, { type: "string" });
    } else {
      wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    }

    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) { (self as any).postMessage({ type: "result", ok: false, error: "Nessun foglio trovato." } as Msg); return; }

    const raw: any[] = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    if (!raw.length) { (self as any).postMessage({ type: "result", ok: false, error: "Il file è vuoto." } as Msg); return; }

    const headerKeys = Object.keys(raw[0] ?? {});
    const annoKey = headerKeys.find(k => /^anno$/i.test(String(k).trim()));
    const meseKey = headerKeys.find(k => /^mese$/i.test(String(k).trim()));
    if (!annoKey || !meseKey) { (self as any).postMessage({ type: "result", ok: false, error: "Intestazioni richieste: 'Anno' e 'Mese'." } as Msg); return; }

    const categoryCols = headerKeys.filter(k => k !== annoKey && k !== meseKey);
    if (!categoryCols.length) { (self as any).postMessage({ type: "result", ok: false, error: "Aggiungi almeno una colonna categoria." } as Msg); return; }

    const total = raw.length;
    const out: ParsedRow[] = [];

    // progress reale a chunk
    const steps = Math.min(60, Math.max(20, Math.ceil(total / 50)));
    const chunkSize = Math.max(10, Math.ceil(total / steps));

    let processed = 0;
    for (let start = 0; start < total; start += chunkSize) {
      const end = Math.min(total, start + chunkSize);

      for (let i = start; i < end; i++) {
        const r = raw[i];
        const year = Number(String(r[annoKey]).trim());
        const mnum = normMonth(r[meseKey]);
        if (year && mnum) {
          const iso = String(year).padStart(4,"0") + "-" + String(mnum).padStart(2,"0") + "-01";
          // stop alla prima cella vuota
          for (const col of categoryCols) {
            const cellStr = String(r[col] ?? '').trim();
            if (cellStr === '') break;
            const val = parseItNumber(r[col]);
            if (val == null) continue;
            const catName = String(col).trim() || "Categoria";
            out.push({ Date: iso, Account: catName, Category: catName, AssetClass: "Other", Currency: "EUR", Value: val });
          }
        }
        processed++;
      }

      const pct = Math.max(1, Math.min(99, Math.round((processed / total) * 98)));
      (self as any).postMessage({ type: "progress", value: pct } as Msg);
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    (self as any).postMessage({ type: "progress", value: 100 } as Msg);
    (self as any).postMessage({ type: "result", ok: true, rows: out } as Msg);
  } catch (err: any) {
    (self as any).postMessage({ type: "result", ok: false, error: err?.message || "Errore di parsing" } as Msg);
  }
};
EOF

echo "[2/5] Scrivo App.tsx con barra smooth e sezione Categories (glass)..."
cat > src/App.tsx <<'EOF'
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from 'recharts'
import { Upload as UploadIcon, Sparkles, TrendingUp, Filter, Search, PieChart as PieIcon, LineChart as LineIcon, ChevronLeft, ChevronRight, LayoutGrid, Download, HardDrive, BookOpen } from 'lucide-react'
import * as XLSX from 'xlsx'

type BalanceRow = { Date: string; Account: string; Category?: string; AssetClass?: string; Currency?: string; Value: number }

function parseDate(input: any): string {
  if (input == null || input === '') return ''
  if (typeof input === 'number') {
    const epoch = (XLSX.SSF as any)?.parse_date_code?.(input)
    if (epoch) { const d = new Date(epoch.y, (epoch.m || 1) - 1, epoch.d || 1); return d.toISOString().slice(0,10) }
  }
  const d = new Date(input)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
  return String(input)
}
function numberFormat(n: number | undefined | null) { if (n == null || isNaN(n as any)) return '–'; return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n as number) }
function monthKey(dateISO: string) { return dateISO ? dateISO.slice(0,7) : '' }

function useKeyNav(onLeft: ()=>void, onRight: ()=>void){ useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==='ArrowLeft') onLeft(); if(e.key==='ArrowRight') onRight(); }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[onLeft,onRight]) }
function Pager({ pages, index, setIndex }:{ pages: React.ReactNode[]; index: number; setIndex:(i:number)=>void; }){
  const safeIndex = pages.length? ((index % pages.length) + pages.length) % pages.length : 0
  const paginate = useCallback((dir:number)=>{ if(!pages.length) return; setIndex(index + dir) },[index,setIndex,pages.length])
  useKeyNav(()=>paginate(-1), ()=>paginate(1))
  if(!pages.length) return <div className="card glass">Nessuna pagina da mostrare.</div>
  return (
    <div className="pager">
      <button className="nav-btn left" onClick={()=>paginate(-1)}><ChevronLeft size={18}/></button>
      <button className="nav-btn right" onClick={()=>paginate(1)}><ChevronRight size={18}/></button>
      <div style={{overflow:'hidden', borderRadius: 16}}>
        <div key={safeIndex}>{pages[safeIndex]}</div>
      </div>
      <div className="dots">{pages.map((_,i)=> (<div key={i} className={"dot " + (i===safeIndex? "active": "")}/>))}</div>
    </div>
  )
}

export default function App(){
  const [rows, setRows] = useState<BalanceRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [assetFilter, setAssetFilter] = useState<string>('All')
  const [section, setSection] = useState<'Summary'|'Net Worth'|'Allocation'|'Accounts'|'Categories'>('Summary')
  const [pageIdx, setPageIdx] = useState(0)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const smooth = useRef<number>(0)
  const target = useRef<number>(0)
  const timer = useRef<any>(null)

  useEffect(()=>{ const v=localStorage.getItem("wd_rows_v21"); if(v){ try{ const p=JSON.parse(v); if(Array.isArray(p)) setRows(p) }catch{}} }, [])

  useEffect(()=>{
    if(!loading){ if(timer.current){ clearInterval(timer.current); timer.current=null } return }
    if(timer.current) clearInterval(timer.current)
    timer.current = setInterval(()=>{
      if(smooth.current < target.current){
        smooth.current = Math.min(target.current, smooth.current + 1)
        setProgress(Math.round(smooth.current))
      } else if (target.current >= 99 && smooth.current >= 99){
        clearInterval(timer.current); timer.current=null
      }
    }, 60)
    return ()=>{ if(timer.current) clearInterval(timer.current) }
  },[loading])

  const data = useMemo(()=> rows && rows.length? rows : [], [rows])
  const normalized = useMemo(()=> data.map(r => ({
    ...r,
    Date: parseDate(r.Date),
    Account: r.Account?.trim() || 'Manual',
    Category: r.Category || 'Other',
    AssetClass: r.AssetClass || 'Other',
    Currency: r.Currency || 'EUR',
    Value: typeof (r as any).Value === 'string' ? Number((r as any).Value) : (r as any).Value,
  })).filter(r => r.Date && !isNaN(r.Value as any)),[data])

  const categories = useMemo(()=> Array.from(new Set(normalized.map(r=>r.Category || 'Other'))).sort(), [normalized])

  const filtered = useMemo(()=> normalized.filter(r => {
    const q=query.toLowerCase();
    const matchesQuery = q? (r.Account.toLowerCase().includes(q) || r.Category!.toLowerCase().includes(q) || r.AssetClass!.toLowerCase().includes(q)) : true;
    const matchesCat = categoryFilter==='All' ? true : r.Category===categoryFilter;
    const matchesAsset = assetFilter==='All' ? true : r.AssetClass===assetFilter;
    return matchesQuery && matchesCat && matchesAsset
  }), [normalized, query, categoryFilter, assetFilter])

  const byMonth = useMemo(()=>{ const map = new Map<string, number>(); filtered.forEach(r => { const k = monthKey(r.Date); map.set(k, (map.get(k)||0)+ (r.Value as number)) }); return Array.from(map.entries()).map(([k,v])=>({month:k, value:v})).sort((a,b)=>a.month.localeCompare(b.month)) },[filtered])

  const latestByAccount = useMemo(()=>{ const accDates = new Map<string,string>(); filtered.forEach(r => { const k = r.Account; const m = monthKey(r.Date); if(!accDates.has(k) || m > (accDates.get(k) || '')) accDates.set(k,m) }); const totals = new Map<string, number>(); filtered.forEach(r => { const m = monthKey(r.Date); if (m === accDates.get(r.Account)) totals.set(r.Account, (totals.get(r.Account)||0) + (r.Value as number)) }); return Array.from(totals.entries()).map(([Account, Value])=>({Account, Value})).sort((a,b)=>b.Value-a.Value) },[filtered])

  const allocationByAsset = useMemo(()=>{ const totals = new Map<string,number>(); const latestMonth = byMonth.length? byMonth[byMonth.length-1].month : ''; filtered.forEach(r => { if (monthKey(r.Date) === latestMonth) totals.set(r.AssetClass!, (totals.get(r.AssetClass!)||0) + (r.Value as number)) }); return Array.from(totals.entries()).map(([name, value])=>({name, value})).sort((a,b)=>b.value-a.value) },[filtered, byMonth])
  const allocationByCategory = useMemo(()=>{ const totals = new Map<string,number>(); const latestMonth = byMonth.length? byMonth[byMonth.length-1].month : ''; filtered.forEach(r => { if (monthKey(r.Date) === latestMonth) totals.set(r.Category!, (totals.get(r.Category!)||0) + (r.Value as number)) }); return Array.from(totals.entries()).map(([name, value])=>({name, value})).sort((a,b)=>b.value-a.value) },[filtered, byMonth])

  const seriesByCategory = useMemo(()=>{
    const obj: Record<string, {month:string, value:number}[]> = {}
    categories.forEach(c => { obj[c] = [] })
    const map = new Map<string, Map<string, number>>()
    normalized.forEach(r=>{
      const c = r.Category || 'Other'; const m = monthKey(r.Date)
      if(!map.has(c)) map.set(c, new Map())
      const inner = map.get(c)!; inner.set(m, (inner.get(m)||0) + (r.Value as number))
    })
    for (const c of categories) {
      const inner = map.get(c) || new Map()
      obj[c] = Array.from(inner.entries()).map(([month, value])=>({month, value})).sort((a,b)=>a.month.localeCompare(b.month))
    }
    return obj
  },[normalized, categories])

  const netWorth = byMonth.length ? byMonth[byMonth.length-1].value : 0
  const prevNetWorth = byMonth.length>1 ? byMonth[byMonth.length-2].value : 0
  const delta = netWorth - prevNetWorth
  const deltaPct = prevNetWorth ? (delta / prevNetWorth) * 100 : 0

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.target as HTMLInputElement;
    const f = inputEl.files?.[0]; if(!f) { inputEl.value=''; return }
    if (f.size > 30 * 1024 * 1024) { setErrorMsg("File troppo grande (>30MB)."); inputEl.value=''; return; }
    setErrorMsg(null); setLoading(true); setProgress(1); smooth.current = 1; target.current = 5;
    try {
      const buf = await f.arrayBuffer();
      const worker = new Worker(new URL("./workers/xlsxWorker.ts", import.meta.url), { type: "module" });
      const cleanup = () => { try { worker.terminate(); } catch {} inputEl.value=''; }
      worker.onmessage = (ev: MessageEvent<any>) => {
        if (ev.data && ev.data.type === "progress") { target.current = Math.max(target.current, ev.data.value || 0); return; }
        if (ev.data && ev.data.type === "result") {
          if (!ev.data.ok) { setErrorMsg(ev.data.error || "Errore di parsing"); setLoading(false); cleanup(); return; }
          setRows(ev.data.rows || []);
          try { localStorage.setItem("wd_rows_v21", JSON.stringify(ev.data.rows || [])); } catch {}
          target.current = 100; setProgress(100); setLoading(false); cleanup();
        }
      };
      worker.postMessage({ buffer: buf, name: f.name }, [buf as any]);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || "Errore di caricamento");
      inputEl.value='';
    }
  }

  const SummaryPages = byMonth.length ? [
    (<div key="sum1" className="card glass">
      <div className="row" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="card glass"><div className="subtle">Net worth</div><div className="big">{numberFormat(netWorth)}</div></div>
        <div className="card glass"><div className="subtle">Variazione</div><div className="big">{(delta>=0?'+':'')+numberFormat(delta)} <span className="subtle">({deltaPct.toFixed(1)}%)</span></div></div>
        <div className="card glass"><div className="subtle">Account</div><div className="big">{Array.from(new Set(filtered.map(r=>r.Account))).length}</div></div>
      </div>
    </div>),
    (<div key="sum2" className="card glass" style={{height:340}}>
      <h3><TrendingUp size={16}/> Net worth nel tempo</h3>
      <div style={{height:280}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byMonth} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
            <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  const NetWorthPages = byMonth.length ? [
    (<div key="nw1" className="card glass" style={{height:320}}>
      <h3><LineIcon size={16}/> Linea</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byMonth} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
            <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>),
    (<div key="nw2" className="card glass" style={{height:320}}>
      <h3><PieIcon size={16}/> Barre</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byMonth} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
            <Bar dataKey="value" fill="#a78bfa" radius={[8,8,0,0] as any} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  const AllocationPages = allocationByAsset.length || allocationByCategory.length ? [
    (<div key="al1" className="card glass" style={{height:320}}>
      <h3>Allocazione per Asset Class</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={allocationByAsset} dataKey="value" nameKey="name" outerRadius={95} innerRadius={60} paddingAngle={3}>
              {allocationByAsset.map((_, i) => (<Cell key={i} fill={['#60a5fa','#a78bfa','#34d399','#f472b6','#f59e0b','#22d3ee','#e879f9'][i%7]} />))}
            </Pie>
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>),
    (<div key="al2" className="card glass" style={{height:320}}>
      <h3>Allocazione per Categoria</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={allocationByCategory} dataKey="value" nameKey="name" outerRadius={95} innerRadius={60} paddingAngle={3}>
              {allocationByCategory.map((_, i) => (<Cell key={i} fill={['#34d399','#60a5fa','#a78bfa','#f59e0b','#22d3ee','#f472b6'][i%6]} />))}
            </Pie>
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  const colorPool = ['#60a5fa','#a78bfa','#34d399','#f59e0b','#22d3ee','#f472b6','#eab308','#fb7185','#4ade80','#38bdf8']
  const CategoryPages = categories.map((cat, i) => {
    const series = seriesByCategory[cat] || []
    const total = series.length ? series[series.length-1].value : 0
    const prev = series.length>1 ? series[series.length-2].value : 0
    const d = total - prev
    const col = colorPool[i % colorPool.length]
    return (
      <div key={cat} className="card glass cat-card">
        <div className="cat-hero" style={{ background: `linear-gradient(135deg, ${col}33, transparent)`}}>
          <div className="cat-title"><BookOpen size={16}/> {cat}</div>
          <div className="cat-value">{numberFormat(total)}</div>
          <div className="cat-delta">{(d>=0?'+':'') + numberFormat(d)}</div>
        </div>
        <div style={{height:220, marginTop:8}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" stroke="#cbd5e1" />
              <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
              <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
              <Line type="monotone" dataKey="value" stroke={col} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  })

  useEffect(()=>{ setPageIdx(0) }, [section])

  return (
    <div>
      <div className="container">
        <div className="badge"><Sparkles size={16}/> Excel-powered finance hub</div>

        <div className="row row-2" style={{marginTop:16}}>
          <div className="card glass">
            <h3><UploadIcon size={16}/> Carica file (opzionale)</h3>
            <label className="upload">
              <div style={{textAlign:'center'}}>
                <UploadIcon size={22} />
                <div className="subtle" style={{marginTop:6, fontSize:13}}>Trascina il file oppure clicca</div>
                <div className="subtle" style={{fontSize:12}}>Accettiamo .xlsx e .csv</div>
              </div>
              <input type="file" accept=".xlsx,.csv" style={{display:'none'}} onChange={onFile} />
            </label>
            {loading && <div className="badge" style={{marginTop:8}}>Parsing… {progress}%</div>}
            {loading && <div className="progress" style={{marginTop:8}}><div style={{width: progress + '%'}}/></div>}
            {errorMsg && <div className="badge" style={{marginTop:8, background:"rgba(244,63,94,.15)", borderColor:"rgba(244,63,94,.35)"}}>{errorMsg}</div>}
          </div>

          <div className="card glass">
            <h3><Filter size={16}/> Filtri</h3>
            <div className="controls">
              <div style={{position:'relative'}}>
                <Search size={16} style={{position:'absolute', left:10, top:10, opacity:.8}}/>
                <input className="input" style={{paddingLeft:34}} placeholder="Cerca account / categoria / asset" value={query} onChange={(e)=>setQuery(e.target.value)} />
              </div>
              <select className="select" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
                <option value="All">All</option>
                {categories.map(v=> <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="select" value={assetFilter} onChange={(e)=>setAssetFilter(e.target.value)}>
                {['All','Cash','Equity','Bond','Fund','Crypto','Real Estate','Other'].map(v=> <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="tabs" style={{marginTop:8}}>
          {(['Summary','Net Worth','Allocation','Accounts','Categories'] as const).map(s => (
            <button key={s} className={'tab ' + (section===s? 'active':'')} onClick={()=>setSection(s)}>{s}</button>
          ))}
        </div>

        <div style={{marginTop:12}}>
          {section === 'Summary' && (<Pager pages={SummaryPages} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Net Worth' && (<Pager pages={NetWorthPages} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Allocation' && (<Pager pages={AllocationPages} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Accounts' && (<Pager pages={[
            (<div key="ac1" className="card glass">
              <h3>Ultima fotografia per account</h3>
              <div style={{overflowX:'auto'}}>
                <table><thead><tr><th>Account</th><th>Valore</th></tr></thead><tbody>
                  {latestByAccount.map((r,i)=> (<tr key={i}><td>{r.Account}</td><td style={{fontWeight:600}}>{numberFormat(r.Value as number)}</td></tr>))}
                </tbody></table>
              </div>
            </div>),
            (<div key="ac2" className="card glass" style={{height:320}}>
              <h3>Valore per account (barre)</h3>
              <div style={{height:250}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latestByAccount} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="Account" stroke="#cbd5e1" interval={0} angle={-20} height={60} />
                    <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
                    <Tooltip formatter={(v:any)=>numberFormat(Number(v))} />
                    <Bar dataKey="Value" fill="#60a5fa" radius={[8,8,0,0] as any} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>),
          ]} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Categories' && (<Pager pages={CategoryPages} index={pageIdx} setIndex={setPageIdx} />)}
        </div>

        {!data.length && (
          <div className="card glass" style={{marginTop:24}}>
            Nessun dato ancora. Carica un file sopra.
          </div>
        )}
      </div>
    </div>
  )
}
EOF

echo "[3/5] Aggiungo/aggiorno stili glass..."
mkdir -p src
cat >> src/styles.css <<'EOF'

/* Glass + polish */
.card.glass { background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03)); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 14px; }
.card.glass .big { font-size: 28px; font-weight: 800; }
.cat-card .cat-hero { border-radius: 14px; padding: 14px; border: 1px solid rgba(255,255,255,.1); }
.cat-title { font-weight: 700; opacity:.9; }
.cat-value { font-size: 24px; font-weight: 800; margin-top: 6px; }
.cat-delta { font-size: 13px; opacity:.9; }
.card .recharts-wrapper, .card .recharts-surface { overflow: visible !important; }
.pager .nav-btn { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 999px; padding: 6px 10px; }
.dots { display:flex; gap:6px; justify-content:center; margin-top:8px; }
.dot { width:8px; height:8px; border-radius:8px; background: rgba(255,255,255,.25); }
.dot.active { background: rgba(255,255,255,.85); }
EOF

echo "[4/5] Build produzione..."
npm run build

echo "[5/5] Commit e push..."
git add -A
VERSION=$(date +"%Y.%m.%d-%H%M")
git commit -m "Chunked parsing + glass categories (Build $VERSION)" || true
git push origin main || true

echo "Fatto. Se usi Vercel, aspetta il deploy, poi ricarica la pagina con Cmd+Shift+R."

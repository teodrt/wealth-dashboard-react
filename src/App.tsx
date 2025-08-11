import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from 'recharts'
import { Upload as UploadIcon, FileDown, Sparkles, TrendingUp, Filter, Search, PieChart as PieIcon, LineChart as LineIcon, ChevronLeft, ChevronRight, LayoutGrid, Download, HardDrive } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const directionRef = useRef(0)
  const paginate = useCallback((dir:number)=>{ if(!pages.length) return; directionRef.current = dir; setIndex(index + dir) },[index,setIndex,pages.length])
  useKeyNav(()=>paginate(-1), ()=>paginate(1))
  const swipeThreshold = 80
  if(!pages.length) return <div className="card">Nessuna pagina da mostrare.</div>
  return (<div className="pager">
    <button className="nav-btn left" onClick={()=>paginate(-1)}><ChevronLeft size={18}/></button>
    <button className="nav-btn right" onClick={()=>paginate(1)}><ChevronRight size={18}/></button>
    <div style={{overflow:'hidden', borderRadius: 16}}>
      <AnimatePresence initial={false} custom={directionRef.current}>
        <motion.div key={safeIndex} custom={directionRef.current} initial={{ x: directionRef.current > 0 ? 50 : -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: directionRef.current > 0 ? -50 : 50, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info)=>{ if(info.offset.x < -swipeThreshold) paginate(1); else if (info.offset.x > swipeThreshold) paginate(-1) }}>{pages[safeIndex]}</motion.div>
      </AnimatePresence>
    </div>
    <div className="dots">{pages.map((_,i)=> (<div key={i} className={"dot " + (i===safeIndex? "active": "")}/>))}</div>
  </div>)
}

export default function App(){
  const [rows, setRows] = useState<BalanceRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [assetFilter, setAssetFilter] = useState<string>('All')
  const [section, setSection] = useState<'Summary'|'Net Worth'|'Allocation'|'Accounts'>('Summary')
  const [pageIdx, setPageIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(()=>{ const cached = localStorage.getItem("wd_rows_v21"); if (cached) { try { const p = JSON.parse(cached); if (Array.isArray(p)) setRows(p) } catch {} } }, [])

  const data = useMemo(()=> (rows && rows.length? rows : []), [rows])
  const normalized = useMemo(()=> data.map(r => ({
    ...r,
    Date: parseDate(r.Date),
    Account: r.Account?.trim() || 'Manual',
    Category: r.Category || 'Other',
    AssetClass: r.AssetClass || 'Other',
    Currency: r.Currency || 'EUR',
    Value: typeof (r as any).Value === 'string' ? Number((r as any).Value) : (r as any).Value,
  })).filter(r => r.Date && !isNaN(r.Value as any)),[data])

  const categories = useMemo(() => Array.from(new Set(normalized.map(r => r.Category || 'Other'))).sort(), [normalized])

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

  const netWorth = byMonth.length ? byMonth[byMonth.length-1].value : 0
  const prevNetWorth = byMonth.length>1 ? byMonth[byMonth.length-2].value : 0
  const delta = netWorth - prevNetWorth
  const deltaPct = prevNetWorth ? (delta / prevNetWorth) * 100 : 0

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.target as HTMLInputElement;
    const f = inputEl.files?.[0]; if(!f) { inputEl.value=''; return }
    if (f.size > 30 * 1024 * 1024) { setErrorMsg("File troppo grande (>30MB)."); inputEl.value=''; return; }
    setErrorMsg(null); setLoading(true); setProgress(5);
    try {
      const buf = await f.arrayBuffer();
      const worker = new Worker(new URL("./workers/xlsxWorker.ts", import.meta.url), { type: "module" });
      const cleanup = () => { try { worker.terminate(); } catch {} inputEl.value=''; };
      worker.onmessage = (ev: MessageEvent<any>) => {
        if (ev.data && ev.data.type === "progress") { setProgress(ev.data.value || 0); return; }
        if (ev.data && ev.data.type === "result") {
          if (!ev.data.ok) { setErrorMsg(ev.data.error || "Errore di parsing"); setLoading(false); cleanup(); return; }
          setRows(ev.data.rows || []);
          try { localStorage.setItem("wd_rows_v21", JSON.stringify(ev.data.rows || [])); } catch {}
          setProgress(100);
          setLoading(false);
          cleanup();
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
    (<div key="sum1" className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h3><LayoutGrid size={16}/> Riepilogo KPI</h3><span className="badge">Snapshot</span></div>
      <div className="row" style={{gridTemplateColumns:'repeat(3,1fr)', marginTop:12}}>
        <div className="card"><div className="subtle" style={{fontSize:13, marginBottom:6}}>Net worth (ultimo mese)</div><div style={{fontSize:28, fontWeight:700}}>{numberFormat(netWorth)}</div></div>
        <div className="card"><div className="subtle" style={{fontSize:13, marginBottom:6}}>Variazione mensile</div><div style={{fontSize:28, fontWeight:700}}>{(delta>=0?'+':'')+numberFormat(delta)} <span className="subtle" style={{fontSize:14}}>({deltaPct.toFixed(1)}%)</span></div></div>
        <div className="card"><div className="subtle" style={{fontSize:13, marginBottom:6}}>Account tracciati</div><div style={{fontSize:28, fontWeight:700}}>{Array.from(new Set(filtered.map(r=>r.Account))).length}</div></div>
      </div>
    </div>),
    (<div key="sum2" className="card" style={{height:340}}>
      <h3><TrendingUp size={16}/> Net worth nel tempo</h3>
      <div style={{height:280}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byMonth} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  const NetWorthPages = byMonth.length ? [
    (<div key="nw1" className="card" style={{height:320}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h3><LineIcon size={16}/> Linea</h3><span className="badge">{byMonth.length} mesi</span></div>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byMonth} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>),
    (<div key="nw2" className="card" style={{height:320}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h3><PieIcon size={16}/> Barre</h3><span className="badge">Vista alternativa</span></div>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byMonth} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Bar dataKey="value" fill="#a78bfa" radius={[8,8,0,0] as any} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  const AllocationPages = allocationByAsset.length || allocationByCategory.length ? [
    (<div key="al1" className="card" style={{height:320}}>
      <h3>Allocazione per Asset Class</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={allocationByAsset} dataKey="value" nameKey="name" outerRadius={95} innerRadius={60} paddingAngle={3}>
              {allocationByAsset.map((_, i) => (<Cell key={i} fill={['#60a5fa','#a78bfa','#34d399','#f472b6','#f59e0b','#22d3ee','#e879f9'][i%7]} />))}
            </Pie>
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>),
    (<div key="al2" className="card" style={{height:320}}>
      <h3>Allocazione per Categoria</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={allocationByCategory} dataKey="value" nameKey="name" outerRadius={95} innerRadius={60} paddingAngle={3}>
              {allocationByCategory.map((_, i) => (<Cell key={i} fill={['#34d399','#60a5fa','#a78bfa','#f59e0b','#22d3ee','#f472b6'][i%6]} />))}
            </Pie>
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  const AccountsPages = latestByAccount.length ? [
    (<div key="ac1" className="card">
      <h3>Ultima fotografia per account</h3>
      <div style={{overflowX:'auto'}}>
        <table><thead><tr><th>Account</th><th>Valore</th></tr></thead><tbody>
          {latestByAccount.map((r,i)=> (<tr key={i}><td>{r.Account}</td><td style={{fontWeight:600}}>{numberFormat(r.Value as number)}</td></tr>))}
        </tbody></table>
      </div>
    </div>),
    (<div key="ac2" className="card" style={{height:320}}>
      <h3>Valore per account (barre)</h3>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={latestByAccount} margin={{ left: 36, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="Account" stroke="#cbd5e1" interval={0} angle={-20} height={60} />
            <YAxis width={90} tick={{fontSize:12}} stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat('it-IT').format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Bar dataKey="Value" fill="#60a5fa" radius={[8,8,0,0] as any} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ] : []

  useEffect(()=>{ setPageIdx(0) }, [section])

  return (
    <div>
      <div className="container">
        <div className="badge"><Sparkles size={16}/> Excel-powered finance hub</div>

        <div className="row row-2" style={{marginTop:16}}>
          <div className="card">
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
            <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className="btn"><FileDown size={14}/> Scarica template</button>
              <button className="btn" onClick={()=>{ const v=localStorage.getItem('wd_rows_v21'); if(v) setRows(JSON.parse(v)); }}><HardDrive size={14}/> Carica dati salvati</button>
              <button className="btn" onClick={()=>{ localStorage.removeItem('wd_rows_v21'); setRows([]); }}><Download size={14}/> Pulisci cache</button>
            </div>
          </div>

          <div className="card">
            <h3><Filter size={16}/> Filtri</h3>
            <div className="controls">
              <div style={{position:'relative'}}>
                <Search size={16} style={{position:'absolute', left:10, top:10, opacity:.8}}/>
                <input className="input" style={{paddingLeft:34}} placeholder="Cerca account / categoria / asset" value={query} onChange={(e)=>setQuery(e.target.value)} />
              </div>
              <select className="select" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
                <option value="All">All</option>
                {Array.from(new Set(normalized.map(r => r.Category || 'Other'))).sort().map(v=> <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="select" value={assetFilter} onChange={(e)=>setAssetFilter(e.target.value)}>
                {['All','Cash','Equity','Bond','Fund','Crypto','Real Estate','Other'].map(v=> <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="tabs" style={{marginTop:8}}>
          {(['Summary','Net Worth','Allocation','Accounts'] as const).map(s => (
            <button key={s} className={'tab ' + (section===s? 'active':'')} onClick={()=>setSection(s)}>{s}</button>
          ))}
        </div>

        <div style={{marginTop:12}}>
          {section === 'Summary' && (<Pager pages={SummaryPages} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Net Worth' && (<Pager pages={NetWorthPages} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Allocation' && (<Pager pages={AllocationPages} index={pageIdx} setIndex={setPageIdx} />)}
          {section === 'Accounts' && (<Pager pages={AccountsPages} index={pageIdx} setIndex={setPageIdx} />)}
        </div>

        {!data.length && (
          <div className="card" style={{marginTop:24}}>
            Nessun dato ancora. Carica un file sopra.
          </div>
        )}
      </div>
    </div>
  )
}

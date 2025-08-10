import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from 'recharts'
import { Upload as UploadIcon, FileDown, Sparkles, TrendingUp, Wallet, Filter, Search, PieChart as PieIcon, LineChart as LineIcon, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'

type BalanceRow = {
  Date: string
  Account: string
  Category?: string
  AssetClass?: string
  Currency?: string
  Value: number
}
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
function numberFormat(n: number | undefined | null) {
  if (n == null || isNaN(n as any)) return '–'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n as number)
}
function monthKey(dateISO: string) { return dateISO ? dateISO.slice(0,7) : '' }
function downloadTemplate() {
  const rows: BalanceRow[] = [
    { Date: '2025-01-31', Account: 'ING - Conto Corrente', Category: 'Cash', AssetClass: 'Cash', Currency: 'EUR', Value: 12000 },
    { Date: '2025-01-31', Account: 'IBKR - Brokerage', Category: 'Brokerage', AssetClass: 'Equity', Currency: 'EUR', Value: 35000 },
    { Date: '2025-01-31', Account: 'Cripto - Ledger', Category: 'Brokerage', AssetClass: 'Crypto', Currency: 'EUR', Value: 5000 },
    { Date: '2025-01-31', Account: 'Fondo Pensione', Category: 'Pension', AssetClass: 'Fund', Currency: 'EUR', Value: 18000 },
    { Date: '2025-02-29', Account: 'ING - Conto Corrente', Category: 'Cash', AssetClass: 'Cash', Currency: 'EUR', Value: 15000 },
    { Date: '2025-02-29', Account: 'IBKR - Brokerage', Category: 'Brokerage', AssetClass: 'Equity', Currency: 'EUR', Value: 36000 },
    { Date: '2025-02-29', Account: 'Cripto - Ledger', Category: 'Brokerage', AssetClass: 'Crypto', Currency: 'EUR', Value: 5200 },
    { Date: '2025-02-29', Account: 'Fondo Pensione', Category: 'Pension', AssetClass: 'Fund', Currency: 'EUR', Value: 18250 },
  ]
  const ws = XLSX.utils.json_to_sheet(rows as any)
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Balances')
  const blob = new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'wealth-template.xlsx'; a.click(); URL.revokeObjectURL(url)
}
const SAMPLE: BalanceRow[] = [
  { Date: '2025-03-31', Account: 'ING - Conto Corrente', Category: 'Cash', AssetClass: 'Cash', Currency: 'EUR', Value: 16000 },
  { Date: '2025-03-31', Account: 'IBKR - Brokerage', Category: 'Brokerage', AssetClass: 'Equity', Currency: 'EUR', Value: 38500 },
  { Date: '2025-03-31', Account: 'Cripto - Ledger', Category: 'Brokerage', AssetClass: 'Crypto', Currency: 'EUR', Value: 6100 },
  { Date: '2025-03-31', Account: 'Fondo Pensione', Category: 'Pension', AssetClass: 'Fund', Currency: 'EUR', Value: 19000 },
  { Date: '2025-04-30', Account: 'ING - Conto Corrente', Category: 'Cash', AssetClass: 'Cash', Currency: 'EUR', Value: 14000 },
  { Date: '2025-04-30', Account: 'IBKR - Brokerage', Category: 'Brokerage', AssetClass: 'Equity', Currency: 'EUR', Value: 40200 },
  { Date: '2025-04-30', Account: 'Cripto - Ledger', Category: 'Brokerage', AssetClass: 'Crypto', Currency: 'EUR', Value: 7200 },
  { Date: '2025-04-30', Account: 'Fondo Pensione', Category: 'Pension', AssetClass: 'Fund', Currency: 'EUR', Value: 19500 },
  { Date: '2025-05-31', Account: 'ING - Conto Corrente', Category: 'Cash', AssetClass: 'Cash', Currency: 'EUR', Value: 15500 },
  { Date: '2025-05-31', Account: 'IBKR - Brokerage', Category: 'Brokerage', AssetClass: 'Equity', Currency: 'EUR', Value: 41500 },
  { Date: '2025-05-31', Account: 'Cripto - Ledger', Category: 'Brokerage', AssetClass: 'Crypto', Currency: 'EUR', Value: 7000 },
  { Date: '2025-05-31', Account: 'Fondo Pensione', Category: 'Pension', AssetClass: 'Fund', Currency: 'EUR', Value: 20000 },
]
function useKeyNav(onLeft: ()=>void, onRight: ()=>void) {
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==='ArrowLeft') onLeft(); if(e.key==='ArrowRight') onRight(); }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[onLeft,onRight])
}
function Pager({ pages, index, setIndex }:{ pages: React.ReactNode[]; index: number; setIndex:(i:number)=>void; }){
  const safeIndex = ((index % pages.length) + pages.length) % pages.length
  const directionRef = useRef(0)
  const paginate = useCallback((dir:number)=>{ directionRef.current = dir; setIndex(index + dir) },[index,setIndex])
  useKeyNav(()=>paginate(-1), ()=>paginate(1))
  const swipeThreshold = 80
  return (
    <div className="pager">
      <button className="nav-btn left" onClick={()=>paginate(-1)}><ChevronLeft size={18}/></button>
      <button className="nav-btn right" onClick={()=>paginate(1)}><ChevronRight size={18}/></button>
      <div style={{overflow:'hidden', borderRadius: 16}}>
        <AnimatePresence initial={false} custom={directionRef.current}>
          <motion.div
            key={safeIndex}
            custom={directionRef.current}
            initial={{ x: directionRef.current > 0 ? 50 : -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: directionRef.current > 0 ? -50 : 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info)=>{ if(info.offset.x < -swipeThreshold) paginate(1); else if (info.offset.x > swipeThreshold) paginate(-1) }}
          >{pages[safeIndex]}</motion.div>
        </AnimatePresence>
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
  const [section, setSection] = useState<'Summary'|'Net Worth'|'Allocation'|'Accounts'>('Summary')
  const [pageIdx, setPageIdx] = useState(0)
  const data = useMemo(()=> (rows && rows.length? rows : SAMPLE), [rows])
  const normalized = useMemo(()=>{
    return data.map(r => ({...r, Date: parseDate(r.Date), Account: r.Account?.trim() || 'Unknown', Category: r.Category || 'Other', AssetClass: r.AssetClass || 'Other', Currency: r.Currency || 'EUR', Value: typeof (r as any).Value === 'string' ? Number((r as any).Value) : (r as any).Value,})).filter(r => r.Date && !isNaN(r.Value as any))
  },[data])
  const filtered = useMemo(()=> normalized.filter(r => {
    const matchesQuery = query? (r.Account.toLowerCase().includes(query.toLowerCase()) || r.Category!.toLowerCase().includes(query.toLowerCase()) || r.AssetClass!.toLowerCase().includes(query.toLowerCase())) : true
    const matchesCat = categoryFilter === 'All' ? true : r.Category === categoryFilter
    const matchesAsset = assetFilter === 'All' ? true : r.AssetClass === assetFilter
    return matchesQuery && matchesCat && matchesAsset
  }), [normalized, query, categoryFilter, assetFilter])
  const byMonth = useMemo(()=>{
    const map = new Map<string, number>()
    filtered.forEach(r => { const k = monthKey(r.Date); map.set(k, (map.get(k)||0)+ (r.Value as number)) })
    return Array.from(map.entries()).map(([k,v])=>({month:k, value:v})).sort((a,b)=>a.month.localeCompare(b.month))
  },[filtered])
  const latestByAccount = useMemo(()=>{
    const accDates = new Map<string,string>()
    filtered.forEach(r => { const k = r.Account; const m = monthKey(r.Date); if(!accDates.has(k) || m > (accDates.get(k) || '')) accDates.set(k,m) })
    const totals = new Map<string, number>()
    filtered.forEach(r => { const m = monthKey(r.Date); if (m === accDates.get(r.Account)) totals.set(r.Account, (totals.get(r.Account)||0) + (r.Value as number)) })
    return Array.from(totals.entries()).map(([Account, Value])=>({Account, Value})).sort((a,b)=>b.Value-a.Value)
  },[filtered])
  const allocationByAsset = useMemo(()=>{
    const totals = new Map<string,number>()
    const latestMonth = byMonth.length? byMonth[byMonth.length-1].month : ''
    filtered.forEach(r => { if (monthKey(r.Date) === latestMonth) totals.set(r.AssetClass!, (totals.get(r.AssetClass!)||0) + (r.Value as number)) })
    return Array.from(totals.entries()).map(([name, value])=>({name, value})).sort((a,b)=>b.value-a.value)
  },[filtered, byMonth])
  const allocationByCategory = useMemo(()=>{
    const totals = new Map<string,number>()
    const latestMonth = byMonth.length? byMonth[byMonth.length-1].month : ''
    filtered.forEach(r => { if (monthKey(r.Date) === latestMonth) totals.set(r.Category!, (totals.get(r.Category!)||0) + (r.Value as number)) })
    return Array.from(totals.entries()).map(([name, value])=>({name, value})).sort((a,b)=>b.value-a.value)
  },[filtered, byMonth])
  const netWorth = byMonth.reduce((_, cur)=>cur.value, 0)
  const prevNetWorth = byMonth.length>1 ? byMonth[byMonth.length-2].value : 0
  const delta = netWorth - prevNetWorth
  const deltaPct = prevNetWorth ? (delta / prevNetWorth) * 100 : 0
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if(!f) return
    const reader = new FileReader()
    reader.onload = evt => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets['Balances'] || wb.Sheets[wb.SheetNames[0]]; if(!sheet) return
      const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
      const parsed = json.map((r:any) => ({
        Date: parseDate(r.Date), Account: r.Account, Category: r.Category || 'Other', AssetClass: r.AssetClass || 'Other', Currency: r.Currency || 'EUR', Value: Number(r.Value ?? r.Amount ?? 0)
      }))
      setRows(parsed)
    }
    reader.readAsArrayBuffer(f)
  }
  const SummaryPages = [
    (<div key="sum1" className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h3><LayoutGrid size={16}/> Riepilogo KPI</h3><span className="badge">Snapshot</span></div>
      <div className="row grid-3" style={{marginTop:12}}>
        <div className="card"><div className="subtle" style={{fontSize:13, marginBottom:6}}>Net worth (ultimo mese)</div><div style={{fontSize:28, fontWeight:700}}>{numberFormat(netWorth)}</div></div>
        <div className="card"><div className="subtle" style={{fontSize:13, marginBottom:6}}>Variazione mensile</div><div style={{fontSize:28, fontWeight:700}}>{(delta>=0?'+':'')+numberFormat(delta)} <span className="subtle" style={{fontSize:14}}>({deltaPct.toFixed(1)}%)</span></div></div>
        <div className="card"><div className="subtle" style={{fontSize:13, marginBottom:6}}>Account tracciati</div><div style={{fontSize:28, fontWeight:700}}>{Array.from(new Set(filtered.map(r=>r.Account))).length}</div></div>
      </div>
    </div>),
    (<div key="sum2" className="card" style={{height:340}}>
      <h3><TrendingUp size={16}/> Net worth nel tempo</h3>
      <div style={{height:280}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat().format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ]
  const NetWorthPages = [
    (<div key="nw1" className="card" style={{height:320}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h3><LineIcon size={16}/> Linea</h3><span className="badge">{byMonth.length} mesi</span></div>
      <div style={{height:250}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat().format(v)} />
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
          <BarChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat().format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Bar dataKey="value" fill="#a78bfa" radius={[8,8,0,0] as any} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ]
  const AllocationPages = [
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
  ]
  const AccountsPages = [
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
          <BarChart data={latestByAccount}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="Account" stroke="#cbd5e1" interval={0} angle={-20} height={60} />
            <YAxis stroke="#cbd5e1" tickFormatter={(v)=> new Intl.NumberFormat().format(v)} />
            <Tooltip formatter={(v:any)=>numberFormat(Number(v))} contentStyle={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} />
            <Bar dataKey="Value" fill="#60a5fa" radius={[8,8,0,0] as any} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>),
  ]
  useEffect(()=>{ setPageIdx(0) }, [section])
  return (
    <div>
      <div className="container">
        <div className="badge"><Sparkles size={16}/> Excel-powered finance hub</div>
        <div className="h1"><Wallet size={28}/> Il tuo Wealth Dashboard</div>
        <p className="subtle">Carica un file <b>.xlsx</b> con il foglio <b>Balances</b> (Date, Account, Category, AssetClass, Currency, Value). Scorri le pagine con frecce ⬅️➡️ o swipe.</p>
        <div className="row row-2" style={{marginTop:16}}>
          <div className="card">
            <h3><UploadIcon size={16}/> Carica il tuo Excel</h3>
            <label className="upload">
              <div style={{textAlign:'center'}}>
                <UploadIcon size={22} />
                <div className="subtle" style={{marginTop:6, fontSize:13}}>Trascina qui il file oppure clicca</div>
                <div className="subtle" style={{fontSize:12}}>Accettiamo solo .xlsx</div>
              </div>
              <input type="file" accept=".xlsx" style={{display:'none'}} onChange={onFile} />
            </label>
            <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className="btn" onClick={downloadTemplate}><FileDown size={14}/> Scarica template</button>
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
                {['All','Cash','Brokerage','Pension','Real Estate','Loan','Other'].map(v=> <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="select" value={assetFilter} onChange={(e)=>setAssetFilter(e.target.value)}>
                {['All','Cash','Equity','Bond','Fund','Crypto','Real Estate','Other'].map(v=> <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="tabs">
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
        <div className="row" style={{marginTop:24}}>
          <div className="card">
            <h3>Note & istruzioni</h3>
            <div className="subtle" style={{fontSize:14}}>
              <p>Il file deve contenere un foglio chiamato <b>Balances</b> con le colonne:</p>
              <ul>
                <li><b>Date</b> (es. 2025-05-31)</li>
                <li><b>Account</b> (es. IBKR - Brokerage)</li>
                <li><b>Category</b> (Cash, Brokerage, Pension, Real Estate, Loan, Other)</li>
                <li><b>AssetClass</b> (Cash, Equity, Bond, Fund, Crypto, Real Estate, Other)</li>
                <li><b>Currency</b> (opzionale, default EUR)</li>
                <li><b>Value</b> (numerico, in EUR)</li>
              </ul>
              <p>Consiglio: aggiorna mensilmente uno <b>snapshot</b> per ogni account. Le allocazioni usano l’ultimo mese disponibile.</p>
            </div>
          </div>
        </div>
        <div className="subtle" style={{textAlign:'center', marginTop:24, fontSize:12}}>Made with ❤️ — scorri tra le pagine con swipe o frecce; il loop è infinito per ogni sezione.</div>
      </div>
    </div>
  )
}

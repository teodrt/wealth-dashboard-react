import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from 'recharts';
import { Upload as UploadIcon, Sparkles, TrendingUp, Filter, Search, PieChart as PieIcon, LineChart as LineIcon, ChevronLeft, ChevronRight, LayoutGrid, Download, HardDrive, BookOpen, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// Import v2.52 components
import GlassCard from './components/GlassCard';
import WallStreetTicker from './components/market/WallStreetTicker';
import NewsHub from './components/insights/NewsHub';
import FiltersBar from './components/FiltersBar';

type BalanceRow = { Date: string; Account: string; Category?: string; AssetClass?: string; Currency?: string; Value: number };

function parseDate(input: any): string {
  if (input == null || input === '') return '';
  if (typeof input === 'number') {
    const epoch = (XLSX.SSF as any)?.parse_date_code?.(input);
    if (epoch) { const d = new Date(epoch.y, (epoch.m || 1) - 1, epoch.d || 1); return d.toISOString().slice(0,10) }
  }
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  return String(input);
}

function numberFormat(n: number | undefined | null) { 
  if (n == null || isNaN(n as any)) return '–'; 
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n as number) 
}

function monthKey(dateISO: string) { return dateISO ? dateISO.slice(0,7) : '' }

function useKeyNav(onLeft: ()=>void, onRight: ()=>void){ 
  useEffect(()=>{ 
    const h=(e:KeyboardEvent)=>{ 
      if(e.key==='ArrowLeft') onLeft(); 
      if(e.key==='ArrowRight') onRight(); 
    }; 
    window.addEventListener('keydown',h); 
    return ()=>window.removeEventListener('keydown',h); 
  },[onLeft,onRight]) 
}

function Pager({ pages, index, setIndex }:{ pages: React.ReactNode[]; index: number; setIndex:(i:number)=>void; }){
  const safeIndex = pages.length? ((index % pages.length) + pages.length) % pages.length : 0
  const paginate = useCallback((dir:number)=>{ if(!pages.length) return; setIndex(index + dir) },[index,setIndex,pages.length])
  useKeyNav(()=>paginate(-1), ()=>paginate(1))
  if(!pages.length) return <GlassCard className="pager-empty">Nessuna pagina da mostrare.</GlassCard>
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
  const [accountFilter, setAccountFilter] = useState<string>('All')
  const [section, setSection] = useState<'Summary'|'Net Worth'|'Allocation'|'Accounts'|'Categories'>('Summary')
  const [pageIdx, setPageIdx] = useState(0)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const smooth = useRef<number>(0)
  const target = useRef<number>(0)
  const timer = useRef<any>(null)
  const workerRef = useRef<Worker | null>(null)

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
  const accounts = useMemo(()=> Array.from(new Set(normalized.map(r=>r.Account || 'Unknown'))).sort(), [normalized])

  const filtered = useMemo(()=> normalized.filter(r => {
    const q=query.toLowerCase();
    const matchesQuery = q? (r.Account.toLowerCase().includes(q) || r.Category!.toLowerCase().includes(q) || r.AssetClass!.toLowerCase().includes(q)) : true;
    const matchesCat = categoryFilter==='All' ? true : r.Category===categoryFilter;
    const matchesAccount = accountFilter==='All' ? true : r.Account===accountFilter;
    return matchesQuery && matchesCat && matchesAccount
  }), [normalized, query, categoryFilter, accountFilter])

  const byMonth = useMemo(()=>{ 
    const map = new Map<string, number>(); 
    filtered.forEach(r => { 
      const k = monthKey(r.Date); 
      map.set(k, (map.get(k)||0)+ (r.Value as number)) 
    }); 
    return Array.from(map.entries()).map(([k,v])=>({month:k, value:v})).sort((a,b)=>a.month.localeCompare(b.month)) 
  },[filtered])

  const latestByAccount = useMemo(()=>{ 
    const accDates = new Map<string,string>(); 
    filtered.forEach(r => { 
      const k = r.Account; 
      const m = monthKey(r.Date); 
      if(!accDates.has(k) || m > (accDates.get(k) || '')) accDates.set(k,m) 
    }); 
    const totals = new Map<string, number>(); 
    filtered.forEach(r => { 
      const m = monthKey(r.Date); 
      if (m === accDates.get(r.Account)) totals.set(r.Account, (totals.get(r.Account)||0) + (r.Value as number)) 
    }); 
    return Array.from(totals.entries()).map(([Account, Value])=>({Account, Value})).sort((a,b)=>b.Value-a.Value) 
  },[filtered])

  const allocationByAsset = useMemo(()=>{ 
    const totals = new Map<string,number>(); 
    const latestMonth = byMonth.length? byMonth[byMonth.length-1].month : ''; 
    filtered.forEach(r => { 
      if (monthKey(r.Date) === latestMonth) totals.set(r.AssetClass!, (totals.get(r.AssetClass!)||0) + (r.Value as number)) 
    }); 
    return Array.from(totals.entries()).map(([name, value])=>({name, value})).sort((a,b)=>b.value-a.value) 
  },[filtered, byMonth])

  const allocationByCategory = useMemo(()=>{ 
    const totals = new Map<string,number>(); 
    const latestMonth = byMonth.length? byMonth[byMonth.length-1].month : ''; 
    filtered.forEach(r => { 
      if (monthKey(r.Date) === latestMonth) totals.set(r.Category!, (totals.get(r.Category!)||0) + (r.Value as number)) 
    }); 
    return Array.from(totals.entries()).map(([name, value])=>({name, value})).sort((a,b)=>b.value-a.value) 
  },[filtered, byMonth])

  const seriesByCategory = useMemo(()=>{
    const obj: Record<string, {month:string, value:number}[]> = {}
    categories.forEach(c => { obj[c] = [] })
    filtered.forEach(r => {
      const month = monthKey(r.Date)
      const category = r.Category || 'Other'
      if (obj[category]) {
        const existing = obj[category].find(item => item.month === month)
        if (existing) {
          existing.value += r.Value as number
        } else {
          obj[category].push({ month, value: r.Value as number })
        }
      }
    })
    return Object.entries(obj).map(([name, data]) => ({
      name,
      data: data.sort((a, b) => a.month.localeCompare(b.month))
    }))
  }, [filtered, categories])

  const onFile = useCallback(async (file: File) => {
    try {
      setLoading(true)
      setErrorMsg(null)
      setProgress(0)
      smooth.current = 0
      target.current = 0

      const buffer = await file.arrayBuffer()
      
      // Use Web Worker for parsing
      if (workerRef.current) {
        workerRef.current.terminate()
      }
      
      workerRef.current = new Worker(new URL('./workers/xlsxWorker.ts', import.meta.url))
      
      workerRef.current.onmessage = (e) => {
        const { type, progress, data, error } = e.data
        
        if (type === 'progress') {
          target.current = progress || 0
        } else if (type === 'complete') {
          const parsedRows = data.map((row: any) => ({
            Date: row.Date || row.A || row['1'] || '',
            Account: row.Account || row.B || row['2'] || 'Unknown',
            Category: row.Category || row.C || row['3'] || 'Other',
            AssetClass: row.AssetClass || row.D || row['4'] || 'Other',
            Currency: row.Currency || row.E || row['5'] || 'EUR',
            Value: Number(row.Value || row.F || row['6'] || 0)
          })).filter((r: any) => r.Date && !isNaN(r.Value))
          
          setRows(parsedRows)
          localStorage.setItem("wd_rows_v21", JSON.stringify(parsedRows))
          setLoading(false)
          target.current = 100
        } else if (type === 'error') {
          setErrorMsg(error || 'Parsing failed')
          setLoading(false)
        }
      }
      
      workerRef.current.postMessage({
        type: 'parse',
        data: buffer,
        id: Date.now().toString()
      })
      
    } catch (err: any) {
      setErrorMsg(err?.message || 'Upload failed')
      setLoading(false)
    }
  }, [])

  const resetFilters = useCallback(() => {
    setQuery('')
    setCategoryFilter('All')
    setAccountFilter('All')
  }, [])

  const clearAllData = useCallback(() => {
    setRows(null)
    localStorage.removeItem("wd_rows_v21")
    resetFilters()
  }, [resetFilters])

  const netWorth = useMemo(() => {
    if (!filtered.length) return 0
    const latestMonth = byMonth.length ? byMonth[byMonth.length - 1].month : ''
    return filtered
      .filter(r => monthKey(r.Date) === latestMonth)
      .reduce((sum, r) => sum + (r.Value as number), 0)
  }, [filtered, byMonth])

  const previousNetWorth = useMemo(() => {
    if (byMonth.length < 2) return 0
    const previousMonth = byMonth[byMonth.length - 2].month
    return filtered
      .filter(r => monthKey(r.Date) === previousMonth)
      .reduce((sum, r) => sum + (r.Value as number), 0)
  }, [filtered, byMonth])

  const delta = netWorth - previousNetWorth
  const deltaPct = previousNetWorth ? (delta / previousNetWorth) * 100 : 0

  const pages = [
    <div key="summary" className="summary-page">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard className="metric-card">
          <h3>Total Wealth</h3>
          <div className="metric-value">{numberFormat(netWorth)}</div>
        </GlassCard>
        <GlassCard className="metric-card">
          <h3>Change vs Previous Month</h3>
          <div className={`metric-value ${delta >= 0 ? 'positive' : 'negative'}`}>
            {delta >= 0 ? '+' : ''}{numberFormat(delta)} ({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
          </div>
        </GlassCard>
        <GlassCard className="metric-card">
          <h3>Accounts</h3>
          <div className="metric-value">{accounts.length}</div>
        </GlassCard>
        <GlassCard className="metric-card">
          <h3>Categories</h3>
          <div className="metric-value">{categories.length}</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="chart-card">
          <h3>Net Worth Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => numberFormat(value as number)} />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="chart-card">
          <h3>Allocation by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {allocationByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => numberFormat(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>,

    <div key="categories" className="categories-page">
      <GlassCard className="categories-overview">
        <h3>Categories Overview</h3>
        <div className="categories-grid">
          {categories.map(category => {
            const categoryData = seriesByCategory.find(s => s.name === category)
            if (!categoryData) return null
            
            const latestValue = categoryData.data[categoryData.data.length - 1]?.value || 0
            const previousValue = categoryData.data[categoryData.data.length - 2]?.value || 0
            const change = latestValue - previousValue
            const changePct = previousValue ? (change / previousValue) * 100 : 0
            
            return (
              <GlassCard key={category} className="category-card">
                <h4>{category}</h4>
                <div className="category-value">{numberFormat(latestValue)}</div>
                <div className={`category-change ${change >= 0 ? 'positive' : 'negative'}`}>
                  {change >= 0 ? '+' : ''}{numberFormat(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={categoryData.data}>
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>
            )
          })}
        </div>
      </GlassCard>
    </div>,

    <div key="net-worth" className="net-worth-page">
      <GlassCard className="net-worth-chart">
        <h3>Net Worth Timeline</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => numberFormat(value as number)} />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>,

    <div key="allocation" className="allocation-page">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="allocation-chart">
          <h3>Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationByAsset}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {allocationByAsset.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} /> 
                ))}
              </Pie>
              <Tooltip formatter={(value) => numberFormat(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="allocation-chart">
          <h3>Category Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={allocationByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => numberFormat(value as number)} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>,

    <div key="accounts" className="accounts-page">
      <GlassCard className="accounts-overview">
        <h3>Accounts Overview</h3>
        <div className="accounts-list">
          {latestByAccount.map(account => (
            <div key={account.Account} className="account-item">
              <div className="account-name">{account.Account}</div>
              <div className="account-value">{numberFormat(account.Value)}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  ]

  return (
    <div className="app">
      {/* Version Banner */}
      <div className="version-banner">
        Version: v2.52 @ 947f4f4
      </div>

      {/* Top Header with Ticker */}
      <div className="top-header">
        <WallStreetTicker />
      </div>

      {/* Main Dashboard */}
      <div className="dashboard-layout">
        {/* Left Column - Header & Summary */}
        <div className="left-column">
          <GlassCard className="header-card">
            <h1>💰 Wealth Dashboard</h1>
            <p>Track your financial portfolio with real-time insights</p>
          </GlassCard>

          {/* Filters Section */}
          <FiltersBar
            query={query}
            setQuery={setQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            accountFilter={accountFilter}
            setAccountFilter={setAccountFilter}
            categories={categories}
            accounts={accounts}
            onResetData={clearAllData}
          />

          {/* Upload Section */}
          <GlassCard className="upload-section">
            <h3><UploadIcon size={16} /> Upload Excel File</h3>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onFile(file)
              }}
              className="file-input"
            />
            {loading && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">{progress}%</div>
              </div>
            )}
            {errorMsg && <div className="error-message">{errorMsg}</div>}
          </GlassCard>
        </div>

        {/* Right Column - Content */}
        <div className="right-column">
          {/* Navigation Tabs */}
          <div className="navigation-tabs">
            <button
              className={`tab ${section === 'Summary' ? 'active' : ''}`}
              onClick={() => setSection('Summary')}
            >
              <LayoutGrid size={16} /> Summary
            </button>
            <button
              className={`tab ${section === 'Categories' ? 'active' : ''}`}
              onClick={() => setSection('Categories')}
            >
              <PieIcon size={16} /> Categories
            </button>
            <button
              className={`tab ${section === 'Net Worth' ? 'active' : ''}`}
              onClick={() => setSection('Net Worth')}
            >
              <LineIcon size={16} /> Net Worth
            </button>
            <button
              className={`tab ${section === 'Allocation' ? 'active' : ''}`}
              onClick={() => setSection('Allocation')}
            >
              <PieIcon size={16} /> Allocation
            </button>
            <button
              className={`tab ${section === 'Accounts' ? 'active' : ''}`}
              onClick={() => setSection('Accounts')}
            >
              <BookOpen size={16} /> Accounts
            </button>
          </div>

          {/* Main Content */}
          <div className="main-content">
            {section === 'Summary' && pages[0]}
            {section === 'Categories' && pages[1]}
            {section === 'Net Worth' && pages[2]}
            {section === 'Allocation' && pages[3]}
            {section === 'Accounts' && pages[4]}
          </div>

          {/* News Hub Section */}
          <div className="news-section">
            <NewsHub />
          </div>
        </div>
      </div>
    </div>
  )
}

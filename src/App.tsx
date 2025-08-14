import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid, AreaChart, Area } from 'recharts';
import { Upload as UploadIcon, Sparkles, TrendingUp, Filter, Search, PieChart as PieIcon, LineChart as LineIcon, ChevronLeft, ChevronRight, LayoutGrid, Download, HardDrive, BookOpen, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// Import v2.52 components
import GlassCard from './components/GlassCard';
import WallStreetTicker from './components/market/WallStreetTicker';
import NewsHub from './components/insights/NewsHub';
import FiltersBar from './components/FiltersBar';
import Uploader from './components/Uploader';
import Header from './components/Header';
import CategoriesCard from './components/CategoriesCard';
import { useDataStore } from './store/dataStore';
import { CATEGORIES } from './config/categories';

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
  return new Intl.NumberFormat('it-IT', { 
    style: 'currency', 
    currency: 'EUR', 
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(n as number) 
}

function numberFormatCompact(n: number | undefined | null) {
  if (n == null || isNaN(n as any)) return '–';
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M €`;
  } else if (n >= 1000) {
    return `${(n / 1000).toFixed(0)}k €`;
  }
  return `${n.toFixed(0)} €`;
}

function monthKey(dateISO: string) { return dateISO ? dateISO.slice(0,7) : '' }

function getCategoryColor(index: number): string {
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
  return colors[index % colors.length];
}

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
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [accountFilter, setAccountFilter] = useState<string>('All')
  
  // Reset account filter when category changes and current account is not available
  useEffect(() => {
    if (categoryFilter !== 'All' && accountFilter !== 'All') {
      const availableAccounts = new Set<string>()
      normalized.forEach(r => {
        if (r.Category === categoryFilter) {
          availableAccounts.add(r.Account || 'Unknown')
        }
      })
      
      if (!availableAccounts.has(accountFilter)) {
        setAccountFilter('All')
      }
    }
  }, [categoryFilter, accountFilter, normalized])
  const [section, setSection] = useState<'Summary'|'Net Worth'|'Allocation'|'Accounts'|'Categories'>('Summary')
  const [pageIdx, setPageIdx] = useState(0)
  
  const { raw: rows } = useDataStore();

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const smooth = useRef<number>(0)
  const target = useRef<number>(0)
  const timer = useRef<any>(null)
  const workerRef = useRef<Worker | null>(null)

  // Legacy data loading - now handled by store
  useEffect(()=>{ 
    const v=localStorage.getItem("wd_rows_v21"); 
    if(v){ 
      try{ 
        const p=JSON.parse(v); 
        if(Array.isArray(p)) {
          // Convert legacy format to new format
          const converted = p.map((row: any) => ({
            date: row.Date || row.date || '',
                      // Convert legacy data to new matrix format
          year: new Date(row.Date || row.date || new Date()).getFullYear(),
          month: new Date(row.Date || row.date || new Date()).getMonth() + 1,
          master: row.Category || row.category || 'alternatives',
          sub: row.Account || row.account || 'Unknown',
          amount: Number(row.Value || row.amount || 0)
        }));
        useDataStore.getState().setRaw(converted);
        }
      }catch(e){
        console.error('Failed to load legacy data:', e);
      }
    } 
  }, [])

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

  const data = useMemo(()=> rows || [], [rows])
  const normalized = useMemo(()=> data.map(r => ({
    ...r,
    Date: new Date(r.year, typeof r.month === 'number' ? r.month - 1 : 0, 1).toISOString(),
    Account: r.sub?.trim() || 'Manual',
    Category: r.master || 'Other',
    AssetClass: r.sub || 'Other',
    Currency: 'EUR',
    Value: typeof r.amount === 'string' ? Number(r.amount) : r.amount,
  })).filter(r => r.Date && !isNaN(r.Value as any)),[data])

  // Calculate last month data for header display
  const lastMonthData = useMemo(() => {
    if (!normalized || normalized.length === 0) return { total: 0, change: 0, changePercent: 0 };
    
    // Get unique months
    const months = [...new Set(normalized.map(r => r.Date))].sort();
    
    if (months.length === 0) return { total: 0, change: 0, changePercent: 0 };
    
    const lastMonth = months[months.length - 1];
    const previousMonth = months.length > 1 ? months[months.length - 2] : lastMonth;
    
    // Get last month total
    const lastMonthTotal = normalized
      .filter(r => r.Date === lastMonth)
      .reduce((sum, r) => sum + (r.Value as number), 0);
    
    // Get previous month total
    const previousMonthTotal = normalized
      .filter(r => r.Date === previousMonth)
      .reduce((sum, r) => sum + (r.Value as number), 0);
    
    const change = lastMonthTotal - previousMonthTotal;
    const changePercent = previousMonthTotal > 0 ? (change / previousMonthTotal) * 100 : 0;
    
    return {
      total: lastMonthTotal,
      change,
      changePercent
    };
  }, [normalized]);

  const categories = useMemo(()=> CATEGORIES.map(c => c.label), [])
  
  // Dynamic accounts based on selected category
  const accounts = useMemo(()=> {
    if (categoryFilter === 'All') {
      return Array.from(new Set(normalized.map(r=>r.Account || 'Unknown'))).sort()
    } else {
      // Filter accounts that have data in the selected category
      const categoryAccounts = new Set<string>()
      normalized.forEach(r => {
        if (r.Category === categoryFilter) {
          categoryAccounts.add(r.Account || 'Unknown')
        }
      })
      return Array.from(categoryAccounts).sort()
    }
  }, [normalized, categoryFilter])

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
          
          // Data is now handled by the store
          console.log('Legacy setRows called - data handled by store');
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
    useDataStore.getState().clear()
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
          <h3>Portfolio performance</h3>
          {byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="month" 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                  tickFormatter={(value) => numberFormatCompact(value)}
                  width={80}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value) => numberFormat(value as number)}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ffffff" 
                  strokeWidth={3} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No data available</p>
            </div>
          )}
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
      <CategoriesCard />
    </div>,

    <div key="net-worth" className="net-worth-page">
              <GlassCard className="net-worth-chart">
          <h3>Net Worth Timeline</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="month" 
                stroke="rgba(255, 255, 255, 0.7)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255, 255, 255, 0.7)"
                fontSize={12}
                tickFormatter={(value) => numberFormatCompact(value)}
                width={80}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value) => numberFormat(value as number)}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
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
      {/* Main Content */}
      <div className="main-content">
        {/* Header Section */}
        <Header 
          filteredData={filtered}
          categoryFilter={categoryFilter}
          accountFilter={accountFilter}
        />

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Left: Portfolio Performance */}
          <div className="portfolio-card">
            <div className="portfolio-header">
              <h3 className="portfolio-title">Portfolio Performance</h3>
            </div>
            
            <div className="chart-container">
              {byMonth.length > 0 && byMonth.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                      tickFormatter={(value) => numberFormatCompact(value)}
                      width={80}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: any) => [numberFormat(value), 'Value']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={4}
                      dot={{ fill: '#3b82f6', strokeWidth: 3, r: 6 }}
                      activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <p>No data available</p>
                  <small>Upload an Excel file to see your portfolio performance</small>
                </div>
              )}
            </div>
          </div>

          {/* Right: Asset Details Sidebar */}
          <div className="asset-sidebar">
            {/* Total Wealth Card */}
            <div className="asset-card">
              <div className="asset-label">Total Wealth</div>
              <div className="asset-value">€{numberFormatCompact(netWorth)}</div>
              <div className="asset-change positive">
                <span>↑</span>
                <span>Active</span>
              </div>
            </div>

            {/* Monthly Change Card */}
            <div className="asset-card">
              <div className="asset-label">Monthly Change</div>
              <div className="asset-value">€{numberFormatCompact(lastMonthData.change)}</div>
              <div className="asset-change positive">
                <span>↑</span>
                <span>{lastMonthData.changePercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* Portfolio Diversity Card */}
            <div className="asset-card">
              <div className="asset-label">Portfolio Diversity</div>
              <div className="asset-value">{categories.length}</div>
              <div className="asset-change positive">
                <span>↑</span>
                <span>Categories</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-header">
            <h3 className="filters-title">Filters & Search</h3>
          </div>
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
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <Uploader
            onDataParsed={(parsedRows) => {
              // Legacy callback - data is now handled by the store
              console.log('Legacy callback received', parsedRows.length, 'rows');
            }}
            onError={(errorMsg) => {
              console.error('Upload error:', errorMsg);
            }}
          />
        </div>

        {/* Categories Section */}
        <div className="categories-section">
          <h3 className="categories-title">Portfolio Categories</h3>
          <CategoriesCard />
        </div>

        {/* Additional Charts Row */}
        <div className="dashboard-grid">
          {/* Net Worth Timeline */}
          <div className="portfolio-card">
            <div className="portfolio-header">
              <h3 className="portfolio-title">Net Worth Timeline</h3>
            </div>
            <div className="chart-container">
              {seriesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255, 255, 255, 0.7)"
                      fontSize={12}
                      tickFormatter={(value) => numberFormatCompact(value)}
                      width={80}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
              />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: any) => [numberFormat(value), 'Value']}
                    />
                    {seriesByCategory.map((series, index) => (
                      <Area
                        key={series.name}
                        type="monotone"
                        dataKey="value"
                        data={series.data}
                        stackId="1"
                        stroke={getCategoryColor(index)}
                        fill={getCategoryColor(index)}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">No data available</div>
              )}
            </div>
          </div>

          {/* News Hub */}
          <div className="portfolio-card">
            <div className="portfolio-header">
              <h3 className="portfolio-title">Market News</h3>
            </div>
            <NewsHub />
          </div>
        </div>
      </div>
    </div>
  )
}

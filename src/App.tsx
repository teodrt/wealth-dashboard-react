import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid } from 'recharts';
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

// STATE: Dynamic filters + selectors
import { useFiltersStore } from './store/filters';
import { selectChartSeries, selectRightPanelStats, selectFilteredRows } from './selectors/portfolio';
import { useDataStore } from './store/dataStore';
import { useWealthData } from './hooks/useWealthData';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { DashboardSection, PaginationState } from './types/state';
import { CATEGORIES } from './config/categories';
import { env } from './config/env';

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

//

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
  // STATE: Filters store (category/sub/dateRange) + local query text
  const { category, sub, setCategory, setSub, reset } = useFiltersStore();
  const [query, setQuery] = useState('');
  const categoryFilter = category ?? 'All';
  const accountFilter = sub ?? 'All';
  const setCategoryFilter = (val: string) => setCategory(val === 'All' ? undefined : (val as any));
  const setAccountFilter = (val: string) => setSub(val === 'All' ? undefined : val);
  
  const [section, setSection] = useState<DashboardSection>('Summary');
  const [pageIdx, setPageIdx] = useState(0);
  
  // STATE: Data
  const { positions, setRaw } = useWealthData();
  // Derived lists
  const categories = useMemo(()=> CATEGORIES.map(c => c.id), []);
  const accounts = useMemo(()=>{
    // Dynamic subs list based on selected category
    const rows = selectFilteredRows(positions, { category: category as any, sub: undefined, dateRange: undefined });
    const subs = new Set<string>();
    rows.forEach(r => { if (r.sub) subs.add(r.sub) });
    return Array.from(subs).sort();
  }, [positions, category]);

  // Selectors: chart series and right panel stats (single source of truth)
  const monthlyData = useMemo(()=> selectChartSeries(positions, { category: category as any, sub, dateRange: undefined }), [positions, category, sub]);
  const rightStats = useMemo(()=> selectRightPanelStats(positions, { category: category as any, sub, dateRange: undefined }), [positions, category, sub]);
  const allocationByCategory = rightStats.allocationByCategory;
  const allocationByAsset: { name: string; value: number }[] = useMemo(()=> {
    // Aggregate by assetClass from normalized PortfolioPosition
    const byAsset = new Map<string, number>();
    const rows = selectFilteredRows(positions, { category: category as any, sub, dateRange: undefined });
    rows.forEach(r => {
      const key = (r as any).assetClass || 'Other';
      byAsset.set(key, (byAsset.get(key) || 0) + r.amount);
    });
    return Array.from(byAsset.entries()).map(([name, value])=>({ name, value })).sort((a,b)=> b.value - a.value);
  }, [positions, category, sub]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const smooth = useRef<number>(0);
  const target = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);

  // STATE: Using auto-refresh hook for progress updates
  const handleProgressTick = useCallback(() => {
    if (smooth.current < target.current) {
      smooth.current = Math.min(target.current, smooth.current + 1);
      setProgress(Math.round(smooth.current));
    }
  }, []);
  
  useAutoRefresh(loading, handleProgressTick, 60);


  //

  const onFile = useCallback(async (file: File) => {
    try {
      setLoading(true)
      setErrorMsg(null)
      setProgress(0)
      smooth.current = 0
      target.current = 0

      // Check file size against environment configuration
      if (file.size > env.maxFileSizeMB * 1024 * 1024) {
        setErrorMsg(`File too large (>${env.maxFileSizeMB}MB).`);
        setLoading(false);
        return;
      }

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
          
          // Data is handled by the store (persisted via middleware)
          console.log('Legacy setRows called - data handled by store');
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
    setQuery('');
    reset();
  }, [reset])

  const clearAllData = useCallback(() => {
    useDataStore.getState().clear();
    resetFilters();
  }, [resetFilters])

  const netWorth = rightStats.total;
  const delta = rightStats.change;
  const deltaPct = rightStats.changePercent;

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
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
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
                  isAnimationActive={false}
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
                isAnimationActive={false}
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
                isAnimationActive={false}
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
          {([] as any[]).map((account: any) => (
            <div key={String(account?.Account)} className="account-item">
              <div className="account-name">{String(account?.Account)}</div>
              <div className="account-value">{numberFormat(Number(account?.Value || 0))}</div>
            </div>
          ))}
        </div>
      </GlassCard>
      </div>
  ]

  return (
    <div className="app">
      {/* Background layer once per page (fixed, out of scroll flow) */}
      <div className="app-bg" aria-hidden />
      {/* Main Content */}
      <div className="main-content app-content">
        {/* Header Section */}
        <Header 
          filteredData={[]}
          categoryFilter={categoryFilter}
          accountFilter={accountFilter}
          lastMonthData={{ total: netWorth, change: delta, changePercent: deltaPct }}
          netWorth={netWorth}
        />

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Left: Portfolio Performance */}
          <div className="portfolio-card">
            <div className="portfolio-header">
              <h3 className="portfolio-title">Portfolio Performance</h3>
            </div>
            
            <div className="chart-container">
              {monthlyData.length > 0 && monthlyData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
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
                      dot={false}
                      activeDot={false}
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
              <div className="asset-value">€{numberFormatCompact(delta)}</div>
              <div className="asset-change positive">
                <span>↑</span>
                <span>{deltaPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Portfolio Diversity Card */}
            <div className="asset-card">
              <div className="asset-label">Portfolio Diversity</div>
              <div className="asset-value">{
                // Unique subcategories under current category
                (() => {
                  const cat = category as any;
                  if (!cat) return 0;
                  const subsSet = new Set<string>();
                  positions.forEach(r => {
                    if ((r as any).category === cat) {
                      const s = (r as any).account?.trim();
                      if (s) subsSet.add(s);
                    }
                  });
                  return subsSet.size;
                })()
              }</div>
              <div className="asset-change positive">
                <span>↑</span>
                <span>{category ? 'Unique subs' : 'Select a category'}</span>
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

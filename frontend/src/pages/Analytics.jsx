import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import { BarChart2, CreditCard, TrendingDown, TrendingUp, PieChart as PieIcon, Activity, DollarSign } from 'lucide-react';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { useToast } from '../contexts/ToastContext';
import LoadingScreen from '../components/LoadingScreen';
import SafeChartContainer from '../components/charts/SafeChartContainer';


export default function Analytics() {
  const { currencySymbol, theme } = useSettings();
  const { addToast } = useToast();
  const isDark = theme === 'dark';

  const [monthly,     setMonthly]     = useState([]);
  const [catTrends,   setCatTrends]   = useState({ months: [], categories: [] });
  const [utilization, setUtilization] = useState({ card_level: [], shared_exposure_level: [] });
  const [alerts,      setAlerts]      = useState([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [emiData,     setEmiData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-premium p-4 rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-left backdrop-blur-md bg-slate-950/60 min-w-[150px]">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-main font-medium">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}
                </span>
                <span className="font-extrabold text-main">
                  {currencySymbol}{Number(entry.value).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const tooltipBg  = isDark ? '#1A1D24' : '#ffffff';
  const axisTick   = isDark ? '#9CA3AF' : '#64748b';
  const gridStroke = isDark ? '#ffffff10' : '#00000010';
  const axisFontSize = 12; // Increased from 11 for better readability

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyRes, catRes, utilRes, insightsRes, emiRes] = await Promise.all([
        api.get('/analytics/monthly-comparison'),
        api.get('/analytics/category-trends'),
        api.get('/analytics/credit-utilization'),
        api.get('/analytics/insights'),
        api.get('/analytics/emi-analytics')
      ]);
      setMonthly(monthlyRes.data ?? []);
      setCatTrends(catRes.data ?? { months: [], categories: [] });
      setUtilization(utilRes.data ?? { card_level: [], shared_exposure_level: [] });
      setAlerts(insightsRes.data?.alerts ?? []);
      setEmiData(emiRes.data ?? null);
    } catch {
      addToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const metrics = useMemo(() => {
    if (!monthly || monthly.length === 0) return null;
    const totalInc = monthly.reduce((sum, m) => sum + (m.income || 0), 0);
    const totalExp = monthly.reduce((sum, m) => sum + (m.expense || 0), 0);
    const count = monthly.length;
    const avgInc = totalInc / count;
    const avgExp = totalExp / count;
    const netFlow = totalInc - totalExp;
    const savingsRate = totalInc > 0 ? (netFlow / totalInc) * 100 : 0;
    return { avgInc, avgExp, netFlow, savingsRate };
  }, [monthly]);

  const { overallOutstanding, overallLimit, overallBurdenPercent } = useMemo(() => {
    let totalOutstanding = 0;
    let totalLimit = 0;
    if (utilization.card_level && utilization.card_level.length > 0) {
      utilization.card_level.forEach(c => {
        totalOutstanding += Number(c.card_outstanding || 0);
        totalLimit += Number(c.card_limit || 0);
      });
    }
    const pct = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;
    return {
      overallOutstanding: totalOutstanding,
      overallLimit: totalLimit,
      overallBurdenPercent: pct
    };
  }, [utilization]);



  return (
    <div className="space-y-5">
      {loading ? (
        <LoadingScreen variant="compact" message="Synthesizing financial reports..." />
      ) : (

        <>
          {/* 0. SMART ALERTS HUD */}
          {alerts && alerts.length > 0 && (
            <div className={`card overflow-hidden transition-all duration-300 relative mb-6 ${
              alerts.some(a => a.severity === 'critical') 
                ? 'border-red-500/20 hover:border-red-500/35 shadow-[0_12px_40px_rgba(239,68,68,0.03)]' 
                : 'border-amber-500/20 hover:border-amber-500/35 shadow-[0_12px_40px_rgba(245,158,11,0.03)]'
            }`}>
              {/* Decorative side accent */}
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                alerts.some(a => a.severity === 'critical') ? 'bg-red-500' : 'bg-amber-500'
              }`} />

              {/* Banner Header */}
              <div 
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${
                    alerts.some(a => a.severity === 'critical')
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    <Activity className={`w-4 h-4 ${alerts.some(a => a.severity === 'critical') ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      Financial Intelligence Alerts
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border ${
                        alerts.some(a => a.severity === 'critical')
                          ? 'bg-red-500/20 text-red-400 border-red-500/20'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                      }`}>
                        {alerts.length} Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium leading-none">
                      {alerts.some(a => a.severity === 'critical') 
                        ? '🚨 Critical system exposure and billing cycles require immediate review.'
                        : '⚠️ System alerts active. Review credit utilization and spendable limits.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-extrabold uppercase tracking-widest text-slate-350 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>{alertsExpanded ? 'Collapse' : 'Review Alerts'}</span>
                  <svg 
                    className={`w-3 h-3 transition-transform duration-300 ${alertsExpanded ? 'rotate-185' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Expandable Scrollable Alert Deck */}
              <AnimatePresence initial={false}>
                {alertsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="border-t border-white/5 bg-slate-950/20"
                  >
                    <div className="p-4 max-h-[250px] overflow-y-auto space-y-2 scrollbar-thin">
                      {alerts.map((alert, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                            alert.severity === 'critical' 
                              ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10' 
                              : 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/10'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            alert.severity === 'critical' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
                          }`} />
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                alert.severity === 'critical'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/15'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                              }`}>
                                {alert.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 1. FINANCIAL METRICS */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 flex flex-col justify-between min-h-[110px] hover:border-primary/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] text-muted uppercase font-bold tracking-wider">Avg Income / Mo</span>
                  <TrendingUp className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight text-main">{currencySymbol}{Number(metrics.avgInc).toFixed(0)}</span>
                  <p className="text-xs text-muted mt-1 font-medium italic opacity-80">Across {monthly.length} month{monthly.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="card p-5 flex flex-col justify-between min-h-[110px] hover:border-danger/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] text-muted uppercase font-bold tracking-wider">Avg Spend / Mo</span>
                  <TrendingDown className="w-4 h-4 text-danger group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight text-main">{currencySymbol}{Number(metrics.avgExp).toFixed(0)}</span>
                  <p className="text-xs text-muted mt-1 font-medium italic opacity-80">Outbound velocity</p>
                </div>
              </div>

              <div className="card p-5 flex flex-col justify-between min-h-[110px] hover:border-warning/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] text-muted uppercase font-bold tracking-wider">EMI Burden / Mo</span>
                  <DollarSign className="w-4 h-4 text-warning group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight text-main">{currencySymbol}{emiData ? Number(emiData.monthly_emi_burden).toFixed(0) : '0'}</span>
                  <p className="text-xs text-muted mt-1 font-medium italic opacity-80">{emiData?.active_emi_count || 0} active obligations</p>
                </div>
              </div>

              <div className="card p-5 flex flex-col justify-between min-h-[110px] hover:border-primary/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] text-muted uppercase font-bold tracking-wider">Avg Savings Rate</span>
                  <Activity className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <span className={`text-2xl font-bold tracking-tight ${metrics.savingsRate >= 20 ? 'text-secondary' : metrics.savingsRate >= 0 ? 'text-yellow-500' : 'text-danger'}`}>
                    {metrics.savingsRate.toFixed(1)}%
                  </span>
                  <p className="text-xs text-muted mt-1 font-medium italic opacity-80">Overall retention rate</p>
                </div>
              </div>
            </div>
          )}

          {/* 1. Monthly Income vs Expense Bar Chart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h2 className="section-heading">Monthly Income vs Expenses</h2>
              <span className="text-xs text-muted ml-auto">Last 6 months</span>
            </div>
            {monthly.length > 0 ? (
              <SafeChartContainer height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barCategoryGap="30%" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="month" stroke={axisTick} tick={{ fill: axisTick, fontSize: axisFontSize }} axisLine={false} tickLine={false} />
                    <YAxis stroke={axisTick} tick={{ fill: axisTick, fontSize: axisFontSize }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${currencySymbol}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} width={65} />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                      content={<CustomTooltip />}
                    />
                    <Bar dataKey="income"  fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={52} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={52} />
                  </BarChart>
                </ResponsiveContainer>
              </SafeChartContainer>
            ) : <EmptyState variant="simple" icon={BarChart2} title="No Data Available" description="Insufficient data to render chart." />}

            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 justify-center">
              {[{ color: '#10B981', label: 'Income' }, { color: '#EF4444', label: 'Expenses' }].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />{label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Responsive Grid Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* 2. Category Trends Area Chart */}
            <div className="card p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <TrendingDown className="w-4 h-4 text-primary" />
                <h2 className="section-heading">Category Spending Trends</h2>
                <span className="text-xs text-muted ml-auto hidden sm:inline">Last 3 months</span>
              </div>
              {catTrends.months.length > 0 && catTrends.categories.length > 0 ? (
                <div className="flex flex-col flex-1">
                  <SafeChartContainer height={260}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={catTrends.months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          {catTrends.categories.map(({ name, color }) => (
                            <linearGradient key={name} id={`grad-${name.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="month" stroke={axisTick} tick={{ fill: axisTick, fontSize: axisFontSize }} axisLine={false} tickLine={false} />
                        <YAxis stroke={axisTick} tick={{ fill: axisTick, fontSize: axisFontSize }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${currencySymbol}${v}`} width={65} />
                        <Tooltip
                          content={<CustomTooltip />}
                        />
                        {catTrends.categories.map(({ name, color }) => {
                          const isDimmed = hoveredCategory && hoveredCategory !== name;
                          return (
                            <Area key={name} type="monotone" dataKey={name}
                              stroke={color} strokeWidth={isDimmed ? 0.5 : 2}
                              fillOpacity={isDimmed ? 0.02 : 1}
                              strokeOpacity={isDimmed ? 0.15 : 1}
                              fill={`url(#grad-${name.replace(/\s/g, '')})`}
                              style={{ transition: 'all 0.3s ease' }}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {catTrends.categories.map(({ name, color }) => {
                      const isDimmed = hoveredCategory && hoveredCategory !== name;
                      return (
                        <button
                          key={name}
                          onMouseEnter={() => setHoveredCategory(name)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-slate-900/30 transition-all duration-300 ${
                            isDimmed
                              ? 'opacity-30 border-transparent scale-95'
                              : 'opacity-100 border-white/5 shadow-md scale-100'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-muted hover:text-main transition-colors">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : <EmptyState variant="simple" icon={TrendingDown} title="No Data Available" description="Insufficient category trend data." />}
            </div>

            <div className="card p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="section-heading">Credit Exposure & Utilization</h2>
              </div>
              <div className="space-y-6 flex-1 overflow-y-auto">
                {/* DYNAMIC SPEEDOMETER BURDEN DIAL */}
                {utilization.card_level && utilization.card_level.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-950/20 border border-white/5 mb-6">
                    {/* Dial SVG */}
                    <div className="relative flex items-center justify-center w-32 h-32 shrink-0">
                      <svg className="w-full h-full transform -rotate-[225deg]" viewBox="0 0 144 144">
                        <defs>
                          <linearGradient id="burden-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                          <filter id="burden-glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        {/* Background Track */}
                        <circle
                          cx="72"
                          cy="72"
                          r="52"
                          className="stroke-slate-800/40"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={326.7}
                          strokeDashoffset={81.7}
                          strokeLinecap="round"
                        />
                        {/* Active Gauge */}
                        <circle
                          cx="72"
                          cy="72"
                          r="52"
                          stroke="url(#burden-grad)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={245}
                          strokeDashoffset={245 - (Math.min(overallBurdenPercent, 100) / 100) * 245}
                          strokeLinecap="round"
                          style={{
                            filter: 'url(#burden-glow)',
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </svg>
                      {/* Center text */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className={`text-base font-black tracking-tight ${
                          overallBurdenPercent > 80 ? 'text-red-400 animate-pulse' : overallBurdenPercent > 40 ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {overallBurdenPercent.toFixed(1)}%
                        </span>
                        <span className="text-[7px] uppercase tracking-widest text-muted font-bold">Debt Burden</span>
                      </div>
                    </div>

                    {/* Info Text */}
                    <div className="flex-1 space-y-1 text-left min-w-0">
                      <h3 className="text-xs font-bold text-main">Burden Factor</h3>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Total credit limit utilization is <strong className={overallBurdenPercent > 50 ? 'text-amber-400' : 'text-emerald-400'}>{overallBurdenPercent.toFixed(1)}%</strong>. Keep this below 30% to maximize financial health.
                      </p>
                      <div className="flex gap-4 pt-1">
                        <div>
                          <span className="text-[8px] text-muted uppercase tracking-wider block font-semibold">Total Outstanding</span>
                          <span className="text-xs font-black text-danger">{currencySymbol}{overallOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-muted uppercase tracking-wider block font-semibold">Total limit</span>
                          <span className="text-xs font-black text-main">{currencySymbol}{overallLimit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INDIVIDUAL CARDS UTILIZATION */}
                {utilization.card_level && utilization.card_level.length > 0 ? (
                  <div className="space-y-4">
                    {utilization.card_level.map((card, idx) => {
                      const pct = card.utilization_percent;
                      const barColor = pct >= 80 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#10B981';
                      return (
                        <div key={`card-${idx}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-main">{card.card_name}</span>
                              {card.network && <span className="text-[10px] text-muted px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5">{card.network}</span>}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[11px] font-bold text-emerald-400">Can Spend: {currencySymbol}{Number(card.actual_spendable).toFixed(0)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted">Outstanding: {currencySymbol}{Number(card.card_outstanding).toFixed(0)} / {currencySymbol}{Number(card.card_limit).toFixed(0)}</span>
                              <span className="text-xs font-bold" style={{ color: barColor }}>{pct}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                          </div>

                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState variant="simple" icon={CreditCard} title="No Credit Exposure" description="Add credit cards to see utilization." />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

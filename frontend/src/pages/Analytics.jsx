import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
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
  const [utilization, setUtilization] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const tooltipBg  = isDark ? '#1A1D24' : '#ffffff';
  const axisTick   = isDark ? '#9CA3AF' : '#64748b';
  const gridStroke = isDark ? '#ffffff10' : '#00000010';
  const axisFontSize = 12; // Increased from 11 for better readability

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyRes, catRes, utilRes] = await Promise.all([
        api.get('/analytics/monthly-comparison'),
        api.get('/analytics/category-trends'),
        api.get('/analytics/credit-utilization'),
      ]);
      setMonthly(monthlyRes.data ?? []);
      setCatTrends(catRes.data ?? { months: [], categories: [] });
      setUtilization(utilRes.data ?? []);
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



  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-main tracking-tight">Analytics</h1>
        <p className="text-muted mt-1 text-sm font-medium">Understand your financial patterns over time.</p>
      </div>

      {loading ? (
        <LoadingScreen variant="compact" message="Synthesizing financial reports..." />
      ) : (

        <>
          {/* 0. Period Aggregate Metrics */}
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

              <div className="card p-5 flex flex-col justify-between min-h-[110px] hover:border-primary/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] text-muted uppercase font-bold tracking-wider">Period Net Flow</span>
                  <DollarSign className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <span className={`text-2xl font-bold tracking-tight ${metrics.netFlow >= 0 ? 'text-secondary' : 'text-danger'}`}>
                    {metrics.netFlow >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(metrics.netFlow).toFixed(0)}
                  </span>
                  <p className="text-xs text-muted mt-1 font-medium italic opacity-80">Cumulative savings</p>
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
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: gridStroke, borderRadius: '10px', fontSize: 13 }}
                      formatter={(v, name) => [`${currencySymbol}${Number(v).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
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
                          contentStyle={{ backgroundColor: tooltipBg, borderColor: gridStroke, borderRadius: '10px', fontSize: 13 }}
                          formatter={(v, name) => [`${currencySymbol}${Number(v).toFixed(2)}`, name]}
                        />
                        {catTrends.categories.map(({ name, color }) => (
                          <Area key={name} type="monotone" dataKey={name}
                            stroke={color} strokeWidth={2}
                            fillOpacity={1} fill={`url(#grad-${name.replace(/\s/g, '')})`}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                  <div className="flex flex-wrap gap-4 mt-4 justify-center">
                    {catTrends.categories.map(({ name, color }) => (
                      <div key={name} className="flex items-center gap-2 text-sm text-muted">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />{name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : <EmptyState variant="simple" icon={TrendingDown} title="No Data Available" description="Insufficient category trend data." />}
            </div>

            {/* 3. Credit Utilization per card */}
            <div className="card p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="section-heading">Credit Card Utilization</h2>
              </div>
              {utilization.length > 0 ? (
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {utilization.map(card => {
                    const pct = card.utilization;
                    const barColor = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#10B981';
                    return (
                      <div key={card.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-muted" />
                            <span className="text-sm font-medium text-main">{card.name}</span>
                            {card.network && <span className="text-[10px] text-muted px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5">{card.network}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted">{currencySymbol}{Number(card.used).toFixed(0)} / {currencySymbol}{Number(card.credit_limit).toFixed(0)}</span>
                            <span className="font-bold" style={{ color: barColor }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState variant="simple" icon={CreditCard} title="No Credit Cards" description="Add credit card accounts to see utilization." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

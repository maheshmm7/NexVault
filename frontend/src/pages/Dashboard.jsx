import { useEffect, useState, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import {
  Wallet, TrendingDown, TrendingUp, CreditCard,
  ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle, Clock, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';
import { BRANDING } from '../config/branding';
import LoadingScreen from '../components/LoadingScreen';

const EMPTY_SUMMARY = {
  total_balance: 0, credit_used: 0, wallet_balance: 0,
  cash_balance: 0, monthly_income: 0, monthly_expense: 0,
};

// ─── Insights Bar ──────────────────────────────────────────────────────────────
function InsightsBar({ insights, currencySymbol }) {
  if (!insights) return null;
  const { month_over_month_change, top_category, avg_credit_utilization, savings_rate } = insights;

  const momUp = month_over_month_change > 0;
  const momColor = momUp ? 'text-danger' : 'text-secondary';
  const MomIcon = momUp ? ArrowUpRight : ArrowDownRight;
  const utilColor = avg_credit_utilization >= 70 ? 'text-danger' : avg_credit_utilization >= 30 ? 'text-yellow-500' : 'text-secondary';
  const savColor  = savings_rate >= 20 ? 'text-secondary' : savings_rate >= 0 ? 'text-yellow-500' : 'text-danger';

  // Intelligent captions
  const momCaption = momUp ? 'Spending increase vs last month' : 'Spending lower vs last month';
  const topCaption = top_category ? `Total: ${currencySymbol}${Number(top_category.total).toFixed(0)} this month` : 'No major spend registered';
  
  let utilCaption = 'Within recommended limits';
  if (avg_credit_utilization >= 70) utilCaption = 'High utilization alert (Watch)';
  else if (avg_credit_utilization >= 30) utilCaption = 'Approaching safe threshold';

  let savCaption = 'Trajectory tracking healthy';
  if (savings_rate < 0) savCaption = 'Deficit: Expense exceeds income';
  else if (savings_rate >= 20) savCaption = 'High savings velocity';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-sm">MoM Spend</p>
          <p className={`text-sm font-bold flex items-center gap-0.5 ${momColor}`}>
            <MomIcon className="w-3.5 h-3.5" />{Math.abs(month_over_month_change)}%
          </p>
          <p className="text-[10px] text-muted mt-0.5 leading-tight truncate" title={momCaption}>{momCaption}</p>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: top_category ? `${top_category.color}18` : 'rgba(255,255,255,0.05)' }}>
          <TrendingDown className="w-4 h-4" style={{ color: top_category?.color || 'var(--muted)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-sm">Top Spend</p>
          <p className="text-sm font-bold text-main truncate">{top_category?.name || '—'}</p>
          <p className="text-[10px] text-muted mt-0.5 leading-tight truncate" title={topCaption}>{topCaption}</p>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <CreditCard className="w-4 h-4 text-danger" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-sm">Avg Credit Used</p>
          <p className={`text-sm font-bold ${utilColor}`}>{avg_credit_utilization}%</p>
          <p className="text-[10px] text-muted mt-0.5 leading-tight truncate" title={utilCaption}>{utilCaption}</p>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <CheckCircle className="w-4 h-4 text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-sm">Savings Rate</p>
          <p className={`text-sm font-bold ${savColor}`}>{savings_rate}%</p>
          <p className="text-[10px] text-muted mt-0.5 leading-tight truncate" title={savCaption}>{savCaption}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Bills Widget ──────────────────────────────────────────────────────────────
function BillsWidget({ bills, currencySymbol, dFormat }) {
  if (!bills || bills.length === 0) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-main">Upcoming Bills</h2>
      </div>
      <div className="space-y-2">
        {bills.slice(0, 4).map(bill => {
          const isOverdue  = bill.status === 'overdue';
          const isDueSoon  = bill.status === 'due_soon';
          const statusColor = isOverdue ? 'text-danger' : isDueSoon ? 'text-yellow-400' : 'text-muted';
          const bgColor = isOverdue ? 'bg-danger/8' : isDueSoon ? 'bg-yellow-400/8' : 'bg-white/[0.02]';
          return (
            <div key={bill.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${bgColor}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                {isOverdue
                  ? <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                  : <Clock className={`w-4 h-4 shrink-0 ${statusColor}`} />
                }
                <div className="min-w-0">
                  <p className="text-xs font-medium text-main truncate">{bill.name}</p>
                  <p className={`text-[10px] ${statusColor}`}>
                    {isOverdue ? 'Overdue' : bill.days_until_due === 0 ? 'Due today' : `In ${bill.days_until_due}d — ${format(new Date(bill.next_due), dFormat)}`}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-xs font-bold text-main">{currencySymbol}{Number(bill.amount_due).toFixed(0)}</p>
                <p className="text-[10px] text-muted">{bill.utilization}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary,    setSummary]    = useState(EMPTY_SUMMARY);
  const [categories, setCategories] = useState([]);
  const [trends,     setTrends]     = useState([]);
  const [insights,   setInsights]   = useState(null);
  const [bills,      setBills]      = useState([]);
  const [loading,    setLoading]    = useState(true);

  const { addToast } = useToast();
  const { currencySymbol, theme, dateTimePreferences } = useSettings();
  const isDark = theme === 'dark';
  const dFormat = dateTimePreferences?.dateFormat || 'dd/MM/yyyy';

  const tooltipBg  = isDark ? '#1A1D24' : '#ffffff';
  const axisTick   = isDark ? '#9CA3AF' : '#64748b';
  const gridStroke = isDark ? '#ffffff10' : '#00000010';

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, catRes, trendRes, insightsRes, billsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/category-distribution'),
        api.get('/analytics/trends'),
        api.get('/analytics/insights'),
        api.get('/analytics/bills'),
      ]);
      setSummary({ ...EMPTY_SUMMARY, ...summaryRes.data });
      setCategories(catRes.data ?? []);
      setInsights(insightsRes.data);
      setBills(billsRes.data ?? []);
      const formattedTrends = (trendRes.data ?? []).map(item => ({
        name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        income: item.income ?? 0,
        expense: item.expense ?? 0,
      }));
      setTrends(formattedTrends);
    } catch {
      addToast('Failed to load dashboard analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    window.addEventListener('transactionAdded', fetchAnalytics);
    return () => window.removeEventListener('transactionAdded', fetchAnalytics);
  }, [fetchAnalytics]);

  const handleSeedDemoData = async () => {
    setLoading(true);
    try {
      await api.post('/users/seed-demo-data');
      addToast('Demo data loaded successfully!', 'success');
      await fetchAnalytics();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to load demo data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasData = Object.values(summary).some(v => v !== 0);
  const fmt = val => `${currencySymbol}${Number(val ?? 0).toFixed(2)}`;
  
  const netFlow = (summary.monthly_income ?? 0) - (summary.monthly_expense ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-main tracking-tight">Overview</h1>
          <p className="text-muted mt-1.5 text-sm font-medium">Your financial summary for this month.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
          <div className="px-4 py-2 text-center">
            <span className="block text-[10px] uppercase font-bold text-muted tracking-wider opacity-60">Net Position</span>
            <span className="text-sm font-bold text-main">{currencySymbol}{Number(summary.total_balance).toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="px-4 py-2 text-center">
            <span className="block text-[10px] uppercase font-bold text-muted tracking-wider opacity-60">Cash Flow</span>
            <span className={`text-sm font-bold ${netFlow >= 0 ? 'text-secondary' : 'text-danger'}`}>
              {netFlow >= 0 ? '+' : ''}{currencySymbol}{Math.abs(netFlow).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingScreen variant="compact" message="Calculating positions..." />
      ) : !hasData ? (
        <EmptyState 
          variant="dashed"
          className="mt-6"
          icon={Wallet}
          title={`Welcome to ${BRANDING.NAME}!`}
          description={`Your dashboard is empty. Load sample data to explore how everything works, or start adding your accounts and transactions.`}
          actionText="Load Sample Data"
          onAction={handleSeedDemoData}
        />

      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard title="Total Balance"    value={fmt(summary.total_balance)}   icon={Wallet}     type="primary" />
            <StatCard title="Credit Used"      value={fmt(summary.credit_used)}     icon={CreditCard} type="expense" />
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted">Wallet & Cash</h3>
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Wallet</span>
                  <span className="text-lg font-semibold text-main">{fmt(summary.wallet_balance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Cash</span>
                  <span className="text-lg font-semibold text-main">{fmt(summary.cash_balance)}</span>
                </div>
              </div>
            </div>
            <StatCard title="Monthly Income"   value={fmt(summary.monthly_income)}  icon={TrendingUp}   type="income" />
            <StatCard title="Monthly Expenses" value={fmt(summary.monthly_expense)} icon={TrendingDown} type="expense" />
          </div>

          {/* Smart Insights */}
          <InsightsBar insights={insights} currencySymbol={currencySymbol} />

          {/* Charts + Bills */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card p-6 lg:col-span-2 flex flex-col min-h-[360px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-main">Cash Flow Trend</h2>
                <div className="flex items-center gap-2 border border-white/5 bg-white/[0.015] py-1.5 px-3 rounded-xl">
                  <span className="text-[10px] text-muted uppercase tracking-wider font-medium">Net Cash Flow</span>
                  <div className={`flex items-center text-xs font-bold gap-0.5 ${netFlow >= 0 ? 'text-secondary' : 'text-danger'}`}>
                    {netFlow >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {currencySymbol}{Math.abs(netFlow).toFixed(0)}
                  </div>
                </div>
              </div>
              {trends.length > 0 ? (
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" stroke={axisTick} tick={{ fill: axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke={axisTick} tick={{ fill: axisTick, fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${currencySymbol}${v}`} width={70} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: gridStroke, borderRadius: '10px' }}
                        itemStyle={{ color: isDark ? '#F3F4F6' : '#0f172a' }} />
                      <Area type="monotone" dataKey="income"  stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#gIncome)" />
                      <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#gExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-60">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No trend data yet</p>
                </div>
              )}
            </div>

            {/* Right: Bills + Pie stacked */}
            <div className="flex flex-col gap-4">
              <BillsWidget bills={bills} currencySymbol={currencySymbol} dFormat={dFormat} />

              <div className="card p-5 flex flex-col flex-1 min-h-[200px]">
                <h2 className="text-sm font-semibold text-main mb-3">Spending by Category</h2>
                {categories.length > 0 ? (
                  <>
                    <div className="w-full h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categories} innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                            {categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const { value, payload: entry } = payload[0];
                              return (
                                <div style={{ background: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: isDark ? '#F3F4F6' : '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
                                  <span>{entry.name}</span>
                                  <span style={{ marginLeft: 4, fontWeight: 700 }}>{currencySymbol}{Number(value).toFixed(2)}</span>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1.5 overflow-y-auto max-h-[100px] pr-1">
                      {categories.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center min-w-0 flex-1">
                            <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-muted truncate text-xs">{cat.name}</span>
                          </div>
                          <span className="font-medium text-main whitespace-nowrap text-xs">{currencySymbol}{Number(cat.value).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-60">
                    <CreditCard className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">No expense data this month</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
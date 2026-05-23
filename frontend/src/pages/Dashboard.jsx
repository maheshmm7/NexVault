import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingDown, TrendingUp, CreditCard,
  ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle, Clock, Zap, Info,
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
import SafeChartContainer from '../components/charts/SafeChartContainer';
import { SkeletonDashboard } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';

const EMPTY_SUMMARY = {
  total_balance: 0, credit_used: 0, wallet_balance: 0,
  cash_balance: 0, monthly_income: 0, monthly_expense: 0,
};

// ─── Insights Bar ──────────────────────────────────────────────────────────────
function InsightsBar({ insights, currencySymbol }) {
  if (!insights) return null;
  const { month_over_month_change, top_category, avg_credit_utilization, savings_rate } = insights;

  const momUp = month_over_month_change > 0;
  const momColor = momUp ? 'text-danger' : 'text-emerald-400';
  const MomIcon = momUp ? ArrowUpRight : ArrowDownRight;
  const utilColor = avg_credit_utilization >= 70 ? 'text-danger' : avg_credit_utilization >= 30 ? 'text-yellow-400' : 'text-emerald-400';
  const savColor  = savings_rate >= 20 ? 'text-emerald-400' : savings_rate >= 0 ? 'text-yellow-400' : 'text-danger';

  // Intelligent captions
  const momCaption = momUp ? 'Spending increase vs last month' : 'Spending lower vs last month';
  const topCaption = top_category ? `Total: ${currencySymbol}${Number(top_category.total).toFixed(0)} this month` : 'No major spend registered';
  
  let utilCaption = 'Within recommended limits';
  if (avg_credit_utilization >= 70) utilCaption = 'High utilization alert (Watch)';
  else if (avg_credit_utilization >= 30) utilCaption = 'Approaching safe threshold';

  let savCaption = 'Trajectory tracking healthy';
  if (savings_rate < 0) savCaption = 'Deficit: Expense exceeds income';
  else if (savings_rate >= 20) savCaption = 'High savings velocity';

  const cardStyle = "card p-4 flex items-center gap-3.5 border border-white/5 hover:border-primary/20 hover:shadow-[0_12px_24px_rgba(59,130,246,0.04)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer select-none bg-slate-900/10 backdrop-blur-sm min-w-[250px] sm:min-w-0 snap-start shrink-0 flex-1";

  return (
    <div className="relative">
      {/* Mobile scroll indicator gradient edge overlay */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 sm:hidden" />
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pb-2.5 sm:pb-0 scrollbar-none -mx-4 px-4 sm:-mx-0 sm:px-0 scroll-smooth">
        <div className={cardStyle}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-primary/20 group-hover:border-primary/40 transition-colors" style={{ background: 'rgba(59,130,246,0.08)' }}>
            <Zap className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-sm select-none">MoM Spend</p>
            <p className={`text-sm sm:text-base font-extrabold flex items-center gap-0.5 ${momColor}`}>
              <MomIcon className="w-4 h-4" />{Math.abs(month_over_month_change)}%
            </p>
            <p className="text-[11px] sm:text-[10px] text-muted mt-0.5 leading-tight truncate select-none" title={momCaption}>{momCaption}</p>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors"
            style={{ 
              background: top_category ? `${top_category.color}10` : 'rgba(255,255,255,0.03)',
              borderColor: top_category ? `${top_category.color}25` : 'rgba(255,255,255,0.05)'
            }}>
            <TrendingDown className="w-4 h-4" style={{ color: top_category?.color || 'var(--muted)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-sm select-none">Top Spend</p>
            <p className="text-sm sm:text-base font-extrabold text-main truncate">{top_category?.name || '—'}</p>
            <p className="text-[11px] sm:text-[10px] text-muted mt-0.5 leading-tight truncate select-none" title={topCaption}>{topCaption}</p>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-rose-500/10 group-hover:border-rose-500/30 transition-colors" style={{ background: 'rgba(239,68,68,0.05)' }}>
            <CreditCard className="w-4 h-4 text-danger" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-sm select-none">Avg Credit Used</p>
            <p className={`text-sm sm:text-base font-extrabold ${utilColor}`}>{avg_credit_utilization}%</p>
            <p className="text-[11px] sm:text-[10px] text-muted mt-0.5 leading-tight truncate select-none" title={utilCaption}>{utilCaption}</p>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/10 group-hover:border-emerald-500/30 transition-colors" style={{ background: 'rgba(16,185,129,0.05)' }}>
            <CheckCircle className="w-4 h-4 text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-sm select-none">Savings Rate</p>
            <p className={`text-sm sm:text-base font-extrabold ${savColor}`}>{savings_rate}%</p>
            <p className="text-[11px] sm:text-[10px] text-muted mt-0.5 leading-tight truncate select-none" title={savCaption}>{savCaption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bills Widget ──────────────────────────────────────────────────────────────
function BillsWidget({ bills, currencySymbol, dFormat }) {
  if (!bills || bills.length === 0) {
    return (
      <div className="card p-4 min-h-[125px] flex flex-col justify-center items-center text-center border-dashed border-white/5 bg-white/[0.005] select-none">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-muted mb-2 opacity-50">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <p className="text-xs font-bold text-main">No Upcoming Bills</p>
        <p className="text-[10px] text-muted max-w-[200px] mt-0.5 leading-normal">
          All linked credit cards are fully synchronized.
        </p>
      </div>
    );
  }
  return (
    <div className="card p-4.5 select-none">
      <div className="flex items-center gap-2 mb-2.5">
        <Clock className="w-4 h-4 text-primary animate-pulse" />
        <h2 className="text-sm font-bold text-main">Upcoming Bills</h2>
      </div>
      <div className="space-y-1.5">
        {bills.slice(0, 4).map(bill => {
          const isOverdue  = bill.status === 'overdue';
          const isDueSoon  = bill.status === 'due_soon';
          const statusColor = isOverdue ? 'text-danger' : isDueSoon ? 'text-yellow-400' : 'text-muted';
          const bgColor = isOverdue ? 'bg-danger/8' : isDueSoon ? 'bg-yellow-400/8' : 'bg-white/[0.02]';
          return (
            <div key={bill.id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${bgColor} hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer`}>
              <div className="flex items-center gap-2.5 min-w-0">
                {isOverdue
                  ? <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                  : <Clock className={`w-4 h-4 shrink-0 ${statusColor}`} />
                }
                <div className="min-w-0">
                  <p className="text-xs font-bold text-main truncate">{bill.name}</p>
                  <p className={`text-[10px] font-semibold ${statusColor}`}>
                    {isOverdue ? 'Overdue' : bill.days_until_due === 0 ? 'Due today' : `In ${bill.days_until_due}d — ${format(new Date(bill.next_due), dFormat)}`}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-xs font-black text-main">{currencySymbol}{Number(bill.amount_due).toFixed(0)}</p>
                <p className="text-[10px] font-semibold text-muted">{bill.utilization}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Custom Trend Tooltip ──────────────────────────────────────────────────
function CustomTrendTooltip({ active, payload, label, currencySymbol }) {
  if (active && payload && payload.length) {
    const incomeVal = payload.find(p => p.dataKey === 'income')?.value ?? 0;
    const expenseVal = payload.find(p => p.dataKey === 'expense')?.value ?? 0;
    return (
      <div className="glass-premium p-3.5 border border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-xs space-y-2 animate-fade-in bg-slate-900/85">
        <p className="font-bold text-main mb-1 select-none">{label}</p>
        <div className="flex items-center gap-6 justify-between min-w-[140px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-muted font-medium">Income:</span>
          </div>
          <span className="font-extrabold text-emerald-400">
            {currencySymbol}{incomeVal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-6 justify-between min-w-[140px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span className="text-muted font-medium">Expense:</span>
          </div>
          <span className="font-extrabold text-rose-400">
            {currencySymbol}{expenseVal.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

// ─── Custom Pie Tooltip ────────────────────────────────────────────────────
function CustomPieTooltip({ active, payload, currencySymbol }) {
  if (active && payload && payload.length) {
    const { value, payload: entry } = payload[0];
    return (
      <div className="glass-premium p-3 border border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-xs flex items-center gap-2.5 animate-fade-in bg-slate-900/85">
        <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: entry.color }} />
        <span className="text-muted font-medium">{entry.name}:</span>
        <span className="font-extrabold text-main">{currencySymbol}{Number(value).toFixed(2)}</span>
      </div>
    );
  }
  return null;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary,    setSummary]    = useState(EMPTY_SUMMARY);
  const [categories, setCategories] = useState([]);
  const [trends,     setTrends]     = useState([]);
  const [insights,   setInsights]   = useState(null);
  const [bills,      setBills]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { addToast } = useToast();
  const { user } = useAuth();
  const { currencySymbol, theme, dateTimePreferences, onboardingAcknowledged, setOnboardingAcknowledged } = useSettings();
  const isDark = theme === 'dark';
  const dFormat = dateTimePreferences?.dateFormat || 'dd/MM/yyyy';

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning';
    if (hr >= 12 && hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  useEffect(() => {
    if (user?.id) {
      if (!onboardingAcknowledged) {
        setShowOnboardingModal(true);
      }
    }
  }, [user, onboardingAcknowledged]);

  const tooltipBg  = isDark ? '#1A1D24' : '#ffffff';
  const axisTick   = isDark ? '#9CA3AF' : '#64748b';
  const gridStroke = isDark ? '#ffffff10' : '#00000010';

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);
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
      const formattedTrends = (trendRes.data ?? []).map(item => {
        const dateObj = new Date(item.date + 'T00:00:00');
        return {
          name: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          shortName: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          income: item.income ?? 0,
          expense: item.expense ?? 0,
        };
      });
      setTrends(formattedTrends);
    } catch {
      setError(true);
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

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="py-10">
        <ErrorState 
          title="Dashboard Fetch Error" 
          message="We couldn't connect to the analytics server. Check your network connection or try again." 
          onRetry={fetchAnalytics} 
        />
      </div>
    );
  }

  const hasData = Object.values(summary).some(v => v !== 0);
  const fmt = val => `${currencySymbol}${Number(val ?? 0).toFixed(2)}`;
  
  const netFlow = (summary.monthly_income ?? 0) - (summary.monthly_expense ?? 0);

  return (
    <>
      {/* Onboarding Welcome & Ledger Starting Date Anchor Modal */}
      {showOnboardingModal && user?.created_at && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in text-center">
          <style>{`
            @keyframes modalScaleIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-modal-scale {
              animation: modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="w-full max-w-lg glass-premium p-8 md:p-10 rounded-[32px] border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.15)] bg-slate-900/90 relative overflow-hidden animate-modal-scale">
            {/* Top decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 border border-amber-500/20">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-main mb-3">
              Ledger Starting Date Anchor
            </h2>
            
            <p className="text-xs text-muted leading-relaxed max-w-md mx-auto mb-6">
              Welcome to <span className="text-amber-400 font-semibold">{BRANDING.NAME}</span>! To ensure absolute mathematical accuracy, chronological consistency, and prevent running balance anomalies, your transaction tracking is anchored specifically from your signup date onwards.
            </p>
            
            {/* Important Info Card */}
            <div className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-5 mb-6 text-left relative overflow-hidden">
              <div className="flex gap-3 items-start">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Onboarding Date Anchor
                  </span>
                  <span className="text-sm font-bold text-main">
                    {format(new Date(user.created_at), dFormat)}
                  </span>
                  <p className="text-[11px] text-muted leading-relaxed pt-1.5">
                    All logging, syncs, and manual transactions start from this day. Attempting to record transactions prior to this onboarding date is strictly blocked to maintain perfect ledger safety.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted mb-6 leading-relaxed">
              We look forward to helping you manage your wealth with ultimate precision and bank-grade intelligence!
            </div>
            
            {/* Acknowledge Button */}
            <button
              type="button"
              onClick={() => {
                setOnboardingAcknowledged(true);
                setShowOnboardingModal(false);
                addToast("Welcome onboarding acknowledged!", "success");
              }}
              className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base rounded-2xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Financial Tracking
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {user?.created_at && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-[0_0_15px_rgba(245,158,11,0.06)] border-amber-500/20 bg-amber-500/[0.04] text-amber-400 select-none backdrop-blur-md animate-fade-in">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  Ledger starts <strong className="font-bold text-main">{format(new Date(user.created_at), dFormat)}</strong>
                </span>
                <span className="text-white/20 select-none">•</span>
                <Link
                  to="/settings?tab=preferences"
                  className="font-bold text-amber-300 hover:text-amber-100 hover:underline transition-all cursor-pointer"
                >
                  Adjust
                </Link>
              </div>
            )}
            {summary.is_demo_active && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.08)] select-none animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Demo Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-white/10 hover:bg-white/[0.04] transition-all select-none w-full sm:w-auto justify-around sm:justify-start">
            <div className="px-3.5 py-1.5 text-center min-w-0 flex-1 sm:flex-initial sm:min-w-[110px]">
              <span className="block text-[10px] uppercase font-bold text-muted tracking-wider opacity-60">Net Position</span>
              <span className="text-sm sm:text-base font-extrabold text-main truncate block tabular-nums">{currencySymbol}{Number(summary.total_balance).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="w-px h-8 bg-white/10 shrink-0" />
            <div className="px-3.5 py-1.5 text-center flex flex-col items-center min-w-0 flex-1 sm:flex-initial sm:min-w-[110px]">
              <span className="block text-[10px] uppercase font-bold text-muted tracking-wider opacity-60 mb-0.5">Cash Flow</span>
              <div className={`flex items-center gap-1 text-sm sm:text-base font-extrabold ${netFlow >= 0 ? 'text-emerald-400' : 'text-danger'} truncate w-full justify-center`}>
                {netFlow >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 animate-pulse" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span className="tabular-nums">{netFlow >= 0 ? '+' : ''}{currencySymbol}{Math.abs(netFlow).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>

      {!hasData ? (
        <div className="space-y-4 mt-6">
          {user?.created_at && (
            <div className="card p-5 border border-amber-500/20 bg-amber-500/[0.02] flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-sm font-bold text-main">Ledger Integrity & Starting Date Anchor</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Welcome to Vaultify! To ensure absolute mathematical accuracy and prevent running balance anomalies, **your transaction ledger starts from your onboarding date ({format(new Date(user.created_at), dFormat)}) onwards**. Recording historical transactions prior to this date is disabled to maintain perfect ledger safety.
                </p>
              </div>
            </div>
          )}
          <EmptyState 
            variant="dashed"
            icon={Wallet}
            title={`Welcome to ${BRANDING.NAME}!`}
            description={`Your dashboard is empty. Explore the demo dashboard to see how everything works, or start adding your accounts and transactions.`}
            actionText="Explore Demo Dashboard"
            onAction={handleSeedDemoData}
          />
        </div>

      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <StatCard title="Total Balance"    value={fmt(summary.total_balance)}   icon={Wallet}     type="primary" />
            <StatCard title="Credit Used"      value={fmt(summary.credit_used)}     icon={CreditCard} type="expense" />
            <div className="card p-5 sm:p-6 flex flex-col justify-between hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_12px_24px_rgba(59,130,246,0.04)] transition-all duration-300 group cursor-pointer bg-slate-900/10 backdrop-blur-sm border border-white/5 select-none relative overflow-hidden col-span-2 sm:col-span-1">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-all duration-300 opacity-0 group-hover:opacity-100 bg-primary" />
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/10 group-hover:bg-primary/10 group-hover:border-primary/25 transition-all duration-300">
                  <Wallet className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider select-none bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  Liquid Assets
                </span>
              </div>
              <div>
                <h3 className="text-muted text-xs sm:text-sm font-semibold mb-2 truncate">Wallet & Cash</h3>
                <div className="space-y-2 border-t border-white/5 pt-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted flex items-center gap-1.5 select-none"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />Wallet</span>
                    <span className="text-main tabular-nums">{fmt(summary.wallet_balance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted flex items-center gap-1.5 select-none"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40" />Cash</span>
                    <span className="text-main tabular-nums">{fmt(summary.cash_balance)}</span>
                  </div>
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
            <div className="card p-5 sm:p-6 lg:col-span-2 flex flex-col min-h-[280px] sm:min-h-[360px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-base font-semibold text-main">Cash Flow Trend</h2>
                <div className="flex items-center gap-2 border border-white/5 bg-white/[0.015] py-1.5 px-3 rounded-xl self-start sm:self-auto">
                  <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Net Cash Flow</span>
                  <div className={`flex items-center text-xs font-bold gap-0.5 ${netFlow >= 0 ? 'text-secondary' : 'text-danger'}`}>
                    {netFlow >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 animate-pulse" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span className="tabular-nums">{currencySymbol}{Math.abs(netFlow).toFixed(0)}</span>
                  </div>
                </div>
              </div>
              {trends.length > 0 ? (
                <SafeChartContainer height={isMobile ? 220 : 300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <XAxis dataKey={isMobile ? "shortName" : "name"} stroke={axisTick} tick={{ fill: axisTick, fontSize: 10 }} axisLine={false} tickLine={false} angle={isMobile ? -25 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 40 : 30} />
                      <YAxis stroke={axisTick} tick={{ fill: axisTick, fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${currencySymbol}${v}`} width={65} />
                      <Tooltip content={<CustomTrendTooltip currencySymbol={currencySymbol} />} />
                      <Area type="monotone" dataKey="income"  stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#gIncome)" activeDot={{ r: 5, strokeWidth: 1, stroke: '#10B981' }} />
                      <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#gExpense)" activeDot={{ r: 5, strokeWidth: 1, stroke: '#EF4444' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </SafeChartContainer>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-60">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No trend data yet</p>
                </div>
              )}
            </div>

             {/* Right: Bills + Pie stacked */}
             <div className="flex flex-col gap-4 lg:max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-none pb-4">
               <BillsWidget bills={bills} currencySymbol={currencySymbol} dFormat={dFormat} />
 
               <div className="card p-5 flex flex-col min-h-[220px]">
                 <h2 className="text-sm font-bold text-main mb-3">Spending by Category</h2>
                 {categories.length > 0 ? (
                   <>
                     <SafeChartContainer height={180} minHeight={130}>
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={categories} innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                             {categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                           </Pie>
                           <Tooltip content={<CustomPieTooltip currencySymbol={currencySymbol} />} />
                         </PieChart>
                       </ResponsiveContainer>
                     </SafeChartContainer>
                     <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 overflow-y-auto max-h-[120px] pr-1 select-none scrollbar-none relative">
                       {categories.map((cat, i) => (
                         <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all min-w-0">
                           <div className="flex items-center min-w-0 flex-1">
                             <div className="w-2.5 h-2.5 rounded-full mr-2 shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.15)]" style={{ backgroundColor: cat.color }} />
                             <span className="text-muted truncate text-xs font-semibold" title={cat.name}>{cat.name}</span>
                           </div>
                           <span className="font-extrabold text-main whitespace-nowrap text-xs shrink-0 tabular-nums">{currencySymbol}{Number(cat.value).toFixed(0)}</span>
                         </div>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-60 min-h-[180px]">
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
    </>
  );
}
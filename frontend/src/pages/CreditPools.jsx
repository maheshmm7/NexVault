import { useState, useEffect, useMemo } from 'react';
import { Building2, CreditCard, Landmark, Trash2, Edit, ChevronDown, Plus, AlertCircle, PieChart } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import Modal from '../components/Modal';
import { SkeletonCard } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';

const calculateBillingCycle = (source) => {
  let stmtDay = source.statement_day;
  let dueDayVal = source.due_day;

  if (!stmtDay && source.billing_date) {
    try { stmtDay = new Date(source.billing_date).getDate(); } catch (e) { /* ignore */ }
  }
  if (!dueDayVal && source.due_date) {
    try { dueDayVal = new Date(source.due_date).getDate(); } catch (e) { /* ignore */ }
  }

  if (!stmtDay && !dueDayVal) return null;
  stmtDay = stmtDay || 1;
  dueDayVal = dueDayVal || 20;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getSafeDate = (year, month, day) => {
    while (month > 11) { year += 1; month -= 12; }
    while (month < 0) { year -= 1; month += 12; }
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const sCurr = getSafeDate(currentYear, currentMonth, stmtDay);
  const sPrev = getSafeDate(currentYear, currentMonth - 1, stmtDay);
  const sNext = getSafeDate(currentYear, currentMonth + 1, stmtDay);

  let sActive, sNextCycle;
  if (today >= sCurr) {
    sActive = sCurr;
    sNextCycle = sNext;
  } else {
    sActive = sPrev;
    sNextCycle = sCurr;
  }

  const getDueDate = (stmtDate) => {
    if (dueDayVal < stmtDay) {
      return getSafeDate(stmtDate.getFullYear(), stmtDate.getMonth() + 1, dueDayVal);
    } else {
      return getSafeDate(stmtDate.getFullYear(), stmtDate.getMonth(), dueDayVal);
    }
  };

  const activePayableDue = getDueDate(sActive);
  activePayableDue.setHours(0, 0, 0, 0);

  const diffTime = activePayableDue.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = today > activePayableDue;
  const daysPastDue = isOverdue
    ? Math.ceil((today.getTime() - activePayableDue.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  let dueColor = 'text-muted';
  if (isOverdue) {
    dueColor = daysPastDue > 30 ? 'text-red-600' : 'text-red-400';
  } else if (daysRemaining <= 1) {
    dueColor = 'text-red-400';
  } else if (daysRemaining <= 5) {
    dueColor = 'text-yellow-400';
  }

  return {
    activePayableDue,
    daysRemaining,
    isOverdue,
    daysPastDue,
    dueColor,
  };
};

export default function CreditPools() {
  const [creditPools, setCreditPools] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [expandedPools, setExpandedPools] = useState({});
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState(null);
  const [deletePoolTarget, setDeletePoolTarget] = useState(null);
  
  const [poolFormData, setPoolFormData] = useState({
    name: '',
    total_limit: '',
    statement_day: 1,
    due_day: 20
  });

  const { currencySymbol } = useSettings();
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [poolRes, accRes] = await Promise.all([
        api.get('/credit-pools'),
        api.get('/sources')
      ]);
      setCreditPools(poolRes.data);
      setAccounts(accRes.data);
    } catch {
      setError(true);
      addToast('Failed to load credit pools', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    window.addEventListener('transactionAdded', fetchData);
    return () => window.removeEventListener('transactionAdded', fetchData);
  }, []);

  const openPoolEdit = (pool) => {
    setEditingPoolId(pool.id);
    setPoolFormData({
      name: pool.name,
      total_limit: pool.total_limit,
      statement_day: pool.statement_day || 1,
      due_day: pool.due_day || 20
    });
    setIsPoolModalOpen(true);
  };

  const openAddPool = () => {
    setEditingPoolId(null);
    setPoolFormData({
      name: '',
      total_limit: '',
      statement_day: 1,
      due_day: 20
    });
    setIsPoolModalOpen(true);
  };

  const handlePoolSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: poolFormData.name,
        total_limit: parseFloat(poolFormData.total_limit),
        statement_day: parseInt(poolFormData.statement_day),
        due_day: parseInt(poolFormData.due_day),
        pool_type: 'shared'
      };

      if (editingPoolId) {
        await api.put(`/credit-pools/${editingPoolId}`, payload);
        addToast('Credit pool updated', 'success');
      } else {
        await api.post('/credit-pools', payload);
        addToast('Credit pool created', 'success');
      }
      setIsPoolModalOpen(false);
      fetchData();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to save credit pool', 'error');
    }
  };

  const confirmDeletePool = async () => {
    try {
      await api.delete(`/credit-pools/${deletePoolTarget.id}`);
      addToast('Credit pool deleted safely. Cards preserved.', 'success');
      setDeletePoolTarget(null);
      fetchData();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch {
      addToast('Failed to delete pool', 'error');
    }
  };

  // Dynamic active pools calculation (pools that actually have cards linked)
  const creditCards = accounts.filter(acc => acc.type === 'credit_card');
  const hasCreditCards = creditCards.length > 0;

  const activePools = creditPools.filter(pool => 
    accounts.some(acc => acc.credit_pool_id === pool.id && acc.type === 'credit_card')
  );

  // Analytics calculations based ONLY on pools with linked cards
  const totalSharedLimit = hasCreditCards ? activePools.reduce((sum, pool) => sum + Number(pool.total_limit || 0), 0) : 0;
  const totalUtilized = hasCreditCards ? activePools.reduce((sum, pool) => sum + Number(pool.utilized_limit || 0), 0) : 0;
  const totalAvailable = hasCreditCards ? activePools.reduce((sum, pool) => sum + Number(pool.available_limit || 0), 0) : 0;
  const overallPercent = totalSharedLimit > 0 ? (totalUtilized / totalSharedLimit) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-end items-center gap-4 mb-2 pb-2">
        <button onClick={openAddPool} className="btn-primary whitespace-nowrap flex items-center text-sm py-2 px-4">
          <Plus className="w-4 h-4 mr-2" />Create Shared Pool
        </button>
      </div>

      {/* Zero Credit Cards Warning Onboarding Banner */}
      {!hasCreditCards && !loading && !error && (
        <div className="relative border border-amber-500/20 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 p-6 backdrop-blur-md overflow-hidden shadow-lg mb-8 animate-fade-in">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-main">No Credit Cards Registered</h3>
              <p className="text-sm text-muted leading-relaxed">
                Shared Credit Pools allow you to group multiple cards, monitor collective utilization, and share limits. Since you currently have no credit cards in your vault, these pools cannot track active operational limits.
              </p>
              <div className="pt-2">
                <a href="/accounts" className="btn-primary inline-flex items-center text-xs py-2 px-4 bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold">
                  Add a Credit Card in Accounts
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          <SkeletonCard type="simple" />
          <SkeletonCard type="credit" />
        </div>
      ) : error ? (
        <ErrorState title="Failed to load Pools" message="Could not fetch credit pool data." onRetry={fetchData} />
      ) : (
        <>
          {creditPools.length > 0 ? (
            <>
              {/* Overall Analytics Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-5 border border-white/5 bg-slate-900/40 relative overflow-hidden group">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Total Shared Limit</div>
                  <div className="text-2xl font-bold text-main">{currencySymbol}{totalSharedLimit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  <PieChart className="absolute -bottom-4 -right-4 w-16 h-16 text-blue-500 opacity-[0.03] group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="card p-5 border border-white/5 bg-slate-900/40 relative overflow-hidden group">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Total Utilized</div>
                  <div className="text-2xl font-bold text-danger">{currencySymbol}{totalUtilized.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="card p-5 border border-white/5 bg-slate-900/40 relative overflow-hidden group">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Total Available</div>
                  <div className="text-2xl font-bold text-emerald-400">{currencySymbol}{totalAvailable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="card p-5 border border-white/5 bg-slate-900/40 relative overflow-hidden group flex flex-col justify-center">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-muted">Overall Utilization</span>
                    <span className="text-main">{overallPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full ${overallPercent > 85 ? 'bg-red-500' : overallPercent > 50 ? 'bg-yellow-500' : 'bg-emerald-500'} transition-all duration-500`} style={{ width: `${Math.min(overallPercent, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Pool Grid */}
              <div className="space-y-8">
                {creditPools.map(pool => {
                  const utilized = Number(pool.utilized_limit || 0);
                  const total = Number(pool.total_limit || 1);
                  const available = Number(pool.available_limit || 0);
                  const percent = (utilized / total) * 100;
                  
                  let progressColor = 'bg-emerald-500';
                  let accentBorder = 'border-emerald-500/20';
                  let glowColor = 'hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]';
                  
                  if (percent > 85) {
                    progressColor = 'bg-red-500';
                    accentBorder = 'border-red-500/20';
                    glowColor = 'hover:shadow-[0_0_20px_rgba(239,68,68,0.08)]';
                  } else if (percent > 50) {
                    progressColor = 'bg-yellow-500';
                    accentBorder = 'border-yellow-500/20';
                    glowColor = 'hover:shadow-[0_0_20px_rgba(234,179,8,0.05)]';
                  }

                  const poolCards = accounts.filter(acc => acc.credit_pool_id === pool.id && acc.type === 'credit_card');
                  const isExpanded = expandedPools[pool.id] !== false;

                  return (
                    <div key={pool.id} className={`border border-white/5 rounded-2xl bg-slate-900/40 backdrop-blur-md overflow-hidden p-6 transition-all duration-300 ${accentBorder} ${glowColor}`}>
                      {/* Pool Header Banner */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-main flex items-center gap-2">
                                {pool.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Shared Pool
                                </span>
                                {poolCards.length > 0 ? (
                                  <span className="text-[10px] font-medium text-muted bg-white/5 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {poolCards.length} {poolCards.length === 1 ? 'Card' : 'Cards'} Linked
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-dashed border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    Inactive • 0 Cards Linked
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pool Limit details */}
                        <div className="grid grid-cols-3 gap-6 md:w-auto w-full md:border-l md:border-white/5 md:pl-6">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Available Limit</span>
                            <span className="text-lg font-extrabold text-emerald-400">{currencySymbol}{available.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Utilized</span>
                            <span className="text-lg font-extrabold text-danger">{currencySymbol}{utilized.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Total Limit</span>
                            <span className="text-lg font-extrabold text-main">{currencySymbol}{Number(pool.total_limit).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                        </div>

                        {/* Edit / Delete actions */}
                        <div className="flex gap-2 items-center">
                          <button onClick={() => openPoolEdit(pool)} className="p-2 text-muted hover:text-main rounded-xl hover:bg-white/5 transition-colors border border-white/5" title="Edit Pool">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeletePoolTarget(pool)} className="p-2 text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors border border-danger/10" title="Delete Pool">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Concentric Glow Utilization Ring & Subdivisions */}
                      <div className="mt-6 pb-6 border-b border-white/5 flex flex-col md:flex-row items-center gap-6">
                        {/* SVG Utilization Ring */}
                        <div className="relative flex items-center justify-center w-28 h-28 shrink-0 bg-slate-950/20 rounded-full border border-white/5 shadow-inner">
                          <svg className="w-full h-full transform -rotate-90">
                            {/* Inner Circle Glow Def */}
                            <defs>
                              <linearGradient id={`grad-${pool.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={percent > 85 ? '#ef4444' : percent > 50 ? '#eab308' : '#10b981'} stopOpacity="1" />
                                <stop offset="100%" stopColor={percent > 85 ? '#b91c1c' : percent > 50 ? '#ca8a04' : '#059669'} stopOpacity="0.8" />
                              </linearGradient>
                              <filter id={`glow-${pool.id}`}>
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            {/* Background Track */}
                            <circle
                              cx="56"
                              cy="56"
                              r="42"
                              className="stroke-slate-800/40"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            {/* Radial Sweep Ring */}
                            <circle
                              cx="56"
                              cy="56"
                              r="42"
                              stroke={`url(#grad-${pool.id})`}
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={263.89}
                              strokeDashoffset={263.89 - (Math.min(percent, 100) / 100) * 263.89}
                              strokeLinecap="round"
                              style={{
                                filter: `url(#glow-${pool.id})`,
                                transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className={`text-lg font-black tracking-tight ${
                              percent > 85 ? 'text-red-400' : percent > 50 ? 'text-yellow-400' : 'text-emerald-400'
                            }`}>
                              {percent.toFixed(1)}%
                            </span>
                            <span className="text-[8px] uppercase tracking-widest text-muted font-bold">Utilized</span>
                          </div>
                        </div>

                        {/* Dynamic Member Outstanding Subdivisions */}
                        <div className="flex-1 w-full space-y-3">
                          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Member Subdivisions</h4>
                          {poolCards.length > 0 ? (
                            <div className="space-y-2">
                              {poolCards.map((card, idx) => {
                                const cardOutstanding = Number(card.card_outstanding || 0);
                                const cardSharePercent = total > 0 ? (cardOutstanding / total) * 100 : 0;
                                
                                // Beautiful alternating color theme for member divisions
                                const colors = [
                                  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20' },
                                  { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20' },
                                  { bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/20' },
                                  { bg: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/20' },
                                ];
                                const theme = colors[idx % colors.length];

                                return (
                                  <div key={card.id} className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-main font-medium truncate max-w-[150px] sm:max-w-[200px]" title={card.name}>{card.name}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-muted font-normal text-[10px]">
                                          ({cardSharePercent.toFixed(1)}% of pool)
                                        </span>
                                        <span className={`font-bold ${theme.text}`}>
                                          {currencySymbol}{cardOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                      <div 
                                        className={`h-full ${theme.bg} transition-all duration-700 ease-out`} 
                                        style={{ width: `${Math.min(cardSharePercent, 100)}%` }} 
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-muted italic p-3 bg-slate-950/20 rounded-xl border border-dashed border-white/5">
                              No active spenders. Add credit cards to link their outstanding balance.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Linked Cards Accordion Trigger or Onboarding Guidance for Inactive Pools */}
                      {poolCards.length > 0 ? (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setExpandedPools(prev => ({ ...prev, [pool.id]: prev[pool.id] === false ? true : false }));
                            }}
                            className="flex items-center justify-between w-full text-xs font-bold text-muted hover:text-main transition-all duration-200 py-3 px-3 hover:bg-white/[0.03] rounded-xl border border-white/[0.03] hover:border-white/5"
                          >
                            <span className="flex items-center gap-2 uppercase tracking-wider">
                              <CreditCard className="w-4 h-4 text-blue-400" />
                              Linked Cards ({poolCards.length})
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Cards Grid with Framer Motion spring animation */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-1">
                                  {poolCards.map(card => {
                                    const cardCeiling = Number(card.card_ceiling_limit || card.credit_limit || 0);
                                    const cardOutstanding = Number(card.card_outstanding || 0);
                                    const cardRemaining = Math.max(0, cardCeiling - cardOutstanding);
                                    const usableNow = Math.min(available, cardRemaining);
                                    const isCapped = available < cardRemaining;
                                    const isLimited = available > cardCeiling;
                                    const cardPercent = (cardOutstanding / (cardCeiling || 1)) * 100;
                                    const dates = calculateBillingCycle(card);

                                    return (
                                      <div key={card.id} className="card p-5 group/card flex flex-col justify-between border border-white/5 bg-slate-950/40 relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-lg">
                                        <CreditCard className="absolute -bottom-8 -right-8 w-28 h-28 text-main opacity-[0.02] pointer-events-none group-hover/card:scale-110 transition-transform duration-700" strokeWidth={1} />
                                        
                                        <div>
                                          <div className="flex justify-between items-start mb-4">
                                            <div className="min-w-0">
                                              <h4 className="text-sm font-bold text-main truncate pr-6">{card.name}</h4>
                                              <div className="text-[10px] text-muted tracking-widest mt-0.5 uppercase">{card.network || 'Visa'} • XXXX {card.account_number_last4 || '0000'}</div>
                                            </div>
                                          </div>

                                          {/* Dynamic Usable Badge & Warning Indicators */}
                                          <div className="space-y-2 mb-4">
                                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                              <span className="text-xs text-muted font-semibold">Usable Now</span>
                                              <span className="text-base font-extrabold text-emerald-400">{currencySymbol}{usableNow.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                            </div>

                                            {/* Capped by Shared Pool Limit Indicator */}
                                            {isCapped && (
                                              <div className="flex flex-col gap-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-amber-400">
                                                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                  ⚠️ Capped by Shared Pool Limit
                                                </span>
                                                <span className="text-[9px] text-amber-400/80 leading-snug">
                                                  Restricted by pool availability ({currencySymbol}{available.toLocaleString('en-IN', {maximumFractionDigits: 0})}). Card itself has {currencySymbol}{cardRemaining.toLocaleString('en-IN', {maximumFractionDigits: 0})} remaining.
                                                </span>
                                              </div>
                                            )}

                                            {/* Limited by Card Cap Indicator */}
                                            {isLimited && (
                                              <div className="flex flex-col gap-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-blue-400">
                                                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                  ℹ️ Limited by Card Cap
                                                </span>
                                                <span className="text-[9px] text-blue-400/80 leading-snug">
                                                  Restricted by card's own ceiling cap ({currencySymbol}{cardCeiling.toLocaleString('en-IN', {maximumFractionDigits: 0})}). Pool availability is {currencySymbol}{available.toLocaleString('en-IN', {maximumFractionDigits: 0})}.
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Card Limits */}
                                          <div className="space-y-1.5 text-[10px] border-t border-white/5 pt-3">
                                            <div className="flex justify-between">
                                              <span className="text-muted">Individual Card Ceiling</span>
                                              <span className="font-semibold text-main">{currencySymbol}{cardCeiling.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted">Card Outstanding</span>
                                              <span className="font-semibold text-danger">{currencySymbol}{cardOutstanding.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                            {dates && (
                                              <div className="flex justify-between pt-1 border-t border-white/[0.03]">
                                                <span className="text-muted">
                                                  {dates.isOverdue ? `Overdue (${dates.daysPastDue}d)` : `Due in ${dates.daysRemaining}d`}
                                                </span>
                                                <span className={`font-bold ${dates.dueColor}`}>
                                                  {dates.activePayableDue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Progress Bar of Card Utilization */}
                                        <div className="mt-4">
                                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(cardPercent, 100)}%` }} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="mt-6 border border-dashed border-white/5 rounded-xl p-5 bg-slate-950/20 text-center">
                          <p className="text-xs text-muted leading-relaxed mb-3">
                            No credit cards linked to this pool yet. To link a card, go to the <strong className="text-main">Accounts</strong> page, click <strong className="text-main">Edit</strong> on a credit card, and assign it to this pool.
                          </p>
                          <a href="/accounts" className="btn-secondary text-[11px] py-1 px-3 inline-flex items-center border-white/10 hover:bg-white/5 text-muted hover:text-main">
                            Link a Card Now
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState 
              icon={Building2}
              title="No Shared Credit Pools"
              description="Group your credit cards to share limits across family members or virtual cards."
              actionText="Create Shared Pool"
              onAction={openAddPool}
            />
          )}
        </>
      )}

      {/* Add / Edit Pool Modal */}
      <Modal isOpen={isPoolModalOpen} onClose={() => setIsPoolModalOpen(false)} title={editingPoolId ? 'Edit Credit Pool' : 'Create Credit Pool'}>
        <form onSubmit={handlePoolSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Pool Name</label>
            <input required type="text" value={poolFormData.name} onChange={e => setPoolFormData({ ...poolFormData, name: e.target.value })} className="input-field" placeholder="e.g. Family Travel Pool" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Total Shared Limit</label>
            <input required type="number" step="0.01" value={poolFormData.total_limit} onChange={e => setPoolFormData({ ...poolFormData, total_limit: e.target.value })} className="input-field" placeholder="0.00" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Statement Day (1-31)</label>
              <input type="number" min="1" max="31" required value={poolFormData.statement_day === undefined || poolFormData.statement_day === null ? '' : poolFormData.statement_day} onChange={e => setPoolFormData({ ...poolFormData, statement_day: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Due Day (1-31)</label>
              <input type="number" min="1" max="31" required value={poolFormData.due_day === undefined || poolFormData.due_day === null ? '' : poolFormData.due_day} onChange={e => setPoolFormData({ ...poolFormData, due_day: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} className="input-field" />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsPoolModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingPoolId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Pool Modal */}
      <Modal isOpen={!!deletePoolTarget} onClose={() => setDeletePoolTarget(null)} title="Delete Shared Pool">
        <div className="space-y-6">
          <p className="text-muted leading-relaxed">
            Are you sure you want to delete <strong className="text-main">{deletePoolTarget?.name}</strong>?
            <br/><br/>
            <span className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded block">
              Note: This safely unlinks all cards and converts the pool into an implicit shared group for reporting. It does not delete the linked credit cards.
            </span>
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDeletePoolTarget(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={confirmDeletePool} className="btn-danger">Yes, Delete Pool</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

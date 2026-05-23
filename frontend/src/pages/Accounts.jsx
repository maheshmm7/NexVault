import { useState, useEffect, useMemo } from 'react';
import { Plus, Wallet, Building2, CreditCard, Landmark, Trash2, Edit, ArrowDownRight, ArrowUpRight, Clock, ChevronDown, Copy, Check } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import api from '../services/api';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import PremiumDatePicker from '../components/PremiumDatePicker';
import LoadingScreen from '../components/LoadingScreen';
import ErrorState from '../components/ErrorState';


const typeConfig = {
  bank: { icon: Landmark, color: 'bg-primary/20 text-primary border-primary/30', label: 'Bank Account' },
  credit_card: { icon: CreditCard, color: 'bg-danger/20 text-danger border-danger/30', label: 'Credit Card' },
  debit_card: { icon: CreditCard, color: 'bg-secondary/20 text-secondary border-secondary/30', label: 'Debit Card' },
  wallet: { icon: Wallet, color: 'bg-purple-500/20 text-purple-500 border-purple-500/30', label: 'Digital Wallet' },
  cash: {
    icon: Wallet,
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    label: 'Cash'
  }
};


/**
 * Active-Cycle-First Billing Engine
 * 
 * Models two separate recurring systems like real credit cards:
 * 1. Statement Cycle (e.g. 19th of every month)
 * 2. Payment Due Cycle (e.g. 12th of following month)
 * 
 * Resolution order:
 * 1. Determine the most recent (active) statement date
 * 2. Compute the active payable due date from that statement
 * 3. Determine if that active due is overdue
 * 4. Then compute the next future cycle
 * 
 * Accepts either:
 *   - (statementDay, dueDay) integers for recurring billing
 *   - (billingDateStr, dueDateStr) legacy strings (day is extracted)
 */
const calculateBillingCycle = (source) => {
  // Extract statement_day and due_day (prefer integer fields, fallback to legacy strings)
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
    // Handle month overflow/underflow
    while (month > 11) { year += 1; month -= 12; }
    while (month < 0) { year -= 1; month += 12; }
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // Statement dates: previous, current, next
  const sCurr = getSafeDate(currentYear, currentMonth, stmtDay);
  const sPrev = getSafeDate(currentYear, currentMonth - 1, stmtDay);
  const sNext = getSafeDate(currentYear, currentMonth + 1, stmtDay);

  // Step 1: Resolve the ACTIVE statement (most recent past or current)
  let sActive, sNextCycle;
  if (today >= sCurr) {
    sActive = sCurr;       // Statement already generated this month
    sNextCycle = sNext;    // Next statement is next month
  } else {
    sActive = sPrev;       // Statement from last month is still active
    sNextCycle = sCurr;    // Current month's statement hasn't happened yet
  }

  // Step 2: Compute due date for a given statement date
  const getDueDate = (stmtDate) => {
    if (dueDayVal < stmtDay) {
      // Due falls in the month AFTER the statement month
      return getSafeDate(stmtDate.getFullYear(), stmtDate.getMonth() + 1, dueDayVal);
    } else {
      // Due falls in the same month as the statement
      return getSafeDate(stmtDate.getFullYear(), stmtDate.getMonth(), dueDayVal);
    }
  };

  // Step 3: Active payable due (what must be paid NOW)
  const activePayableDue = getDueDate(sActive);
  activePayableDue.setHours(0, 0, 0, 0);

  // Step 4: Next future due (upcoming cycle)
  const nextFutureDue = getDueDate(sNextCycle);
  nextFutureDue.setHours(0, 0, 0, 0);

  // Step 5: Calculate overdue state from ACTIVE cycle
  const diffTime = activePayableDue.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = today > activePayableDue;
  const daysPastDue = isOverdue
    ? Math.ceil((today.getTime() - activePayableDue.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Step 6: Severity color
  let dueColor = 'text-muted';
  if (isOverdue) {
    dueColor = daysPastDue > 30 ? 'text-red-600' : 'text-red-400';
  } else if (daysRemaining <= 1) {
    dueColor = 'text-red-400';
  } else if (daysRemaining <= 5) {
    dueColor = 'text-yellow-400';
  }

  return {
    // Active cycle (what the user must pay NOW)
    activeStatementDate: sActive,
    activePayableDue,
    daysRemaining,
    isOverdue,
    daysPastDue,
    dueColor,
    // Future cycle (upcoming)
    nextStatementDate: sNextCycle,
    nextFutureDue,
    // Recurring rule metadata
    statementDay: stmtDay,
    dueDay: dueDayVal,
  };
};


export default function Accounts() {

  const [accounts, setAccounts] = useState([]);
  const [expandedPools, setExpandedPools] = useState({});
  const [showAdvancedPool, setShowAdvancedPool] = useState(false);
  const [creditPools, setCreditPools] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPoolId, setEditingPoolId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePoolTarget, setDeletePoolTarget] = useState(null);
  const [isAdvancedCredit, setIsAdvancedCredit] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    balance: '0',

    // Credit Card Fields
    credit_limit: '',
    card_ceiling_limit: '',
    available_limit: '',
    credit_pool_id: '',
    account_number_last4: '',
    network: '',
    billing_date: '',
    due_date: '',

    // Future Ready
    bank_name: '',

    account_holder_name: '',
    account_subtype: '',
    ifsc_code: '',

    upi_id: '',
    linked_bank_name: '',

    cash_label: '',
  });

  const [poolFormData, setPoolFormData] = useState({
    name: '',
    total_limit: '',
    utilized_limit: '',
    statement_day: 1,
    due_day: 20
  });

  const standaloneAccounts = useMemo(() => {
    return accounts;
  }, [accounts]);

  const { addToast } = useToast();
  const { currencySymbol } = useSettings();

  const [inlineEditing, setInlineEditing] = useState({ id: null, field: null, value: '' });
  const [copiedField, setCopiedField] = useState({ id: null, field: null });

  const handleCopy = (text, id, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField({ id, field });
    addToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedField({ id: null, field: null }), 2000);
  };

  const handleInlineSave = async (acc, field, newValue) => {
    if (newValue === undefined || newValue === null || newValue.trim() === '') {
      addToast('Value cannot be empty', 'error');
      setInlineEditing({ id: null, field: null, value: '' });
      return;
    }
    const resolvedName = acc.type === 'cash' && field === 'cash_label' ? newValue : (field === 'name' ? newValue : acc.name);
    const updatedData = {
      ...acc,
      name: resolvedName,
      [field]: newValue,
      balance: Number(acc.balance || 0).toFixed(2),
      credit_limit: acc.credit_limit ? Number(acc.credit_limit).toFixed(2) : null,
      card_ceiling_limit: acc.card_ceiling_limit ? Number(acc.card_ceiling_limit).toFixed(2) : null,
      available_limit: acc.type === 'credit_card'
        ? (Number(acc.card_ceiling_limit || acc.credit_limit || 0) - Number(acc.card_outstanding || 0)).toFixed(2)
        : null,
    };
    try {
      await api.put(`/sources/${acc.id}`, updatedData);
      addToast('Account updated successfully', 'success');
      setInlineEditing({ id: null, field: null, value: '' });
      fetchAccounts();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast(err.response?.data?.detail || 'An error occurred', 'error');
    }
  };

  const totalAssets = accounts
    .filter(acc =>
      ['bank', 'wallet', 'debit_card', 'cash']
        .includes(acc.type)
    )
    .reduce(
      (sum, acc) =>
        sum + Number(acc.balance || 0),
      0
    );

  const totalCreditUsed = accounts
    .filter(acc => acc.type === 'credit_card')
    .reduce(
      (sum, acc) =>
        sum + Number(acc.card_outstanding || 0),
      0
    );

  const totalWalletBalance = accounts
    .filter(acc => acc.type === 'wallet')
    .reduce(
      (sum, acc) =>
        sum + Number(acc.balance || 0),
      0
    );

  const totalCashBalance = accounts
    .filter(acc => acc.type === 'cash')
    .reduce(
      (sum, acc) =>
        sum + Number(acc.balance || 0),
      0
    );
    
  const sourceStats = useMemo(() => {
    const stats = {};
    const thirtyDaysAgo = dayjs().subtract(30, 'days');
    
    accounts.forEach(acc => {
      const sourceTx = transactions.filter(t => t.source_id === acc.id);
      
      // Monthly Spend (last 30 days)
      const monthlySpend = sourceTx
        .filter(t => t.type === 'expense' && dayjs(t.timestamp).isAfter(thirtyDaysAgo))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Monthly Income (last 30 days)
      const monthlyIncome = sourceTx
        .filter(t => t.type === 'income' && dayjs(t.timestamp).isAfter(thirtyDaysAgo))
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      // Last Activity Date
      const lastTx = sourceTx.length > 0 
        ? sourceTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null;
        
      stats[acc.id] = {
        monthlySpend,
        monthlyIncome,
        lastActivity: lastTx ? dayjs(lastTx.timestamp).fromNow() : 'No activity'
      };
    });
    return stats;
  }, [accounts, transactions]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(false);
    try {
      const [sourcesRes, txRes, poolsRes] = await Promise.all([
        api.get('/sources'),
        api.get('/transactions'),
        api.get('/credit-pools').catch(() => ({ data: [] }))
      ]);
      setAccounts(sourcesRes.data);
      setTransactions(txRes.data);
      setCreditPools(poolsRes.data);
    } catch (err) {
      setError(true);
      addToast('Failed to load account data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    window.addEventListener('transactionAdded', fetchAccounts);
    return () => window.removeEventListener('transactionAdded', fetchAccounts);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build clean payload — cash uses cash_label as its name
    const resolvedName = formData.type === 'cash' ? formData.cash_label : formData.name;

    const cleanedData = {
      ...formData,
      name: resolvedName,
      balance: formData.balance === '' ? "0.00" : Number(formData.balance).toFixed(2),
      credit_limit: formData.credit_limit === '' ? null : Number(formData.credit_limit).toFixed(2),
      card_ceiling_limit: formData.card_ceiling_limit === '' ? null : Number(formData.card_ceiling_limit).toFixed(2),
      available_limit: formData.type === 'credit_card' 
        ? (Number(formData.card_ceiling_limit || formData.credit_limit || 0) - Number(formData.balance || 0)).toFixed(2)
        : null,
      credit_pool_id: isAdvancedCredit && formData.credit_pool_id ? formData.credit_pool_id : null
    };
    try {
      if (editingId) {
        await api.put(`/sources/${editingId}`, cleanedData);
        addToast('Account updated successfully', 'success');
      } else {
        await api.post('/sources', cleanedData);
        addToast('Account added successfully', 'success');
      }
      setIsModalOpen(false);
      fetchAccounts();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast(err.response?.data?.detail || 'An error occurred', 'error');
    }
  };

  const handlePoolSubmit = async (e) => {
    e.preventDefault();
    const cleanedData = {
      ...poolFormData,
      total_limit: Number(poolFormData.total_limit).toFixed(2),
      utilized_limit: Number(poolFormData.utilized_limit || 0).toFixed(2)
    };
    try {
      if (editingPoolId) {
        await api.put(`/credit-pools/${editingPoolId}`, cleanedData);
        addToast('Credit Pool updated successfully', 'success');
      } else {
        await api.post('/credit-pools', cleanedData);
        addToast('Credit Pool added successfully', 'success');
      }
      setIsPoolModalOpen(false);
      fetchAccounts();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast(err.response?.data?.detail || 'An error occurred', 'error');
    }
  };

  const openEdit = (account) => {
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,

      // Credit Card
      credit_limit: account.credit_limit || '',
      card_ceiling_limit: account.card_ceiling_limit || account.credit_limit || '',
      available_limit: account.available_limit || '',
      credit_pool_id: account.credit_pool_id || '',

      // Shared
      account_number_last4:
        account.account_number_last4 || '',
      network: account.network || '',
      statement_day: account.statement_day || 1,
      due_day: account.due_day || 20,

      // Bank
      bank_name: account.bank_name || '',
      account_holder_name:
        account.account_holder_name || '',

      account_subtype:
        account.account_subtype || '',

      ifsc_code: account.ifsc_code || '',

      // Wallet
      upi_id: account.upi_id || '',

      linked_bank_name:
        account.linked_bank_name || '',

      // Cash
      cash_label: account.cash_label || '',
    });

    setIsAdvancedCredit(!!account.credit_pool_id);
    setEditingId(account.id);
    setIsModalOpen(true);
  };

  const openPoolEdit = (pool) => {
    setPoolFormData({
      name: pool.name,
      total_limit: pool.total_limit,
      utilized_limit: pool.utilized_limit || '',
      statement_day: pool.statement_day,
      due_day: pool.due_day
    });
    setEditingPoolId(pool.id);
    setShowAdvancedPool(false);
    setIsPoolModalOpen(true);
  };

  const openAdd = (type = 'bank') => {
    setFormData({
      name: '',
      type: type,
      balance: '0',

      // Credit Card
      credit_limit: '',
      card_ceiling_limit: '',
      available_limit: '',
      credit_pool_id: '',

      // Shared
      account_number_last4: '',
      network: '',
      statement_day: 1,
      due_day: 20,

      // Bank
      bank_name: '',

      account_holder_name: '',
      account_subtype: '',
      ifsc_code: '',

      // Wallet
      upi_id: '',
      linked_bank_name: '',

      // Cash
      cash_label: '',
    });

    setEditingId(null);
    setIsAdvancedCredit(false);
    setIsModalOpen(true);
    setIsAddMenuOpen(false);
  };

  const openPoolAdd = () => {
    setPoolFormData({
      name: '',
      total_limit: '',
      utilized_limit: '',
      statement_day: 1,
      due_day: 20
    });
    setEditingPoolId(null);
    setShowAdvancedPool(false);
    setIsPoolModalOpen(true);
    setIsAddMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/sources/${deleteTarget.id}`);
      addToast('Account deleted', 'success');
      setDeleteTarget(null);
      fetchAccounts();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast('Cannot delete account with linked transactions', 'error');
    }
  };

  const handlePoolDelete = async () => {
    if (!deletePoolTarget) return;
    try {
      await api.delete(`/credit-pools/${deletePoolTarget.id}`);
      addToast('Credit Pool deleted safely', 'success');
      setDeletePoolTarget(null);
      fetchAccounts();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast('Failed to delete pool', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-end items-center gap-4 mb-2 pb-2">
        <div className="relative">
          <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className="btn-primary flex items-center shrink-0 group text-sm py-2 px-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isAddMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsAddMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900 shadow-2xl z-50 overflow-hidden py-2">
                <button onClick={() => openAdd('bank')} className="w-full text-left px-4 py-3 text-sm font-medium text-main hover:bg-white/5 flex items-center gap-3 transition-colors">
                  <Landmark className="w-4 h-4 text-primary" />
                  Add Bank Account
                </button>
                <button onClick={() => openAdd('credit_card')} className="w-full text-left px-4 py-3 text-sm font-medium text-main hover:bg-white/5 flex items-center gap-3 transition-colors">
                  <CreditCard className="w-4 h-4 text-danger" />
                  Add Credit Card
                </button>
                <div className="border-t border-white/5 my-1.5"></div>
                <button onClick={() => openAdd('wallet')} className="w-full text-left px-4 py-3 text-sm font-medium text-main hover:bg-white/5 flex items-center gap-3 transition-colors">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  Add Digital Wallet
                </button>
                <button onClick={() => openAdd('cash')} className="w-full text-left px-4 py-3 text-sm font-medium text-main hover:bg-white/5 flex items-center gap-3 transition-colors">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Add Cash Source
                </button>
              </div>
            </>
          )}
        </div>
      </div>


      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="card p-4 hover:border-white/10 transition-all">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
            Total Assets
          </div>

          <div className="text-2xl font-bold text-main">
            {currencySymbol}
            {totalAssets.toFixed(2)}
          </div>
        </div>

        <div className="card p-4 hover:border-white/10 transition-all">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
            Credit Used
          </div>

          <div className="text-2xl font-bold text-red-500">
            {currencySymbol}
            {totalCreditUsed.toFixed(2)}
          </div>
        </div>

        <div className="card p-4 hover:border-white/10 transition-all">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
            Wallet Balance
          </div>

          <div className="text-2xl font-bold text-blue-500">
            {currencySymbol}
            {totalWalletBalance.toFixed(2)}
          </div>
        </div>

        <div className="card p-4 hover:border-white/10 transition-all">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
            Cash Balance
          </div>

          <div className="text-2xl font-bold text-green-500">
            {currencySymbol}
            {totalCashBalance.toFixed(2)}
          </div>
        </div>

      </div>

      {/* SHARED CREDIT POOLS SUMMARY */}
      {accounts.filter(acc => acc.type === 'credit_card').length > 0 && creditPools.length > 0 && (() => {
        const activePools = creditPools.filter(pool =>
          accounts.some(acc => acc.credit_pool_id === pool.id && acc.type === 'credit_card')
        );

        return (
          <div className="mt-8 animate-fade-in">
            <div className="flex justify-between items-end mb-4 border-b border-white/5 pb-2">
              <div>
                <h2 className="text-xl font-bold text-main flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Shared Credit Pools
                </h2>
              </div>
              <a href="/credit-pools" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                Manage Pools &rarr;
              </a>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4 border border-white/5 bg-slate-900/40">
                <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wide">Active Pools</div>
                <div className="text-xl font-bold text-main">{activePools.length}</div>
              </div>
              <div className="card p-4 border border-white/5 bg-slate-900/40">
                <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wide">Total Shared Limit</div>
                <div className="text-xl font-bold text-emerald-400">
                  {currencySymbol}{activePools.reduce((sum, pool) => sum + Number(pool.total_limit || 0), 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </div>
              </div>
              <div className="card p-4 border border-white/5 bg-slate-900/40">
                <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wide">Total Utilized</div>
                <div className="text-xl font-bold text-danger">
                  {currencySymbol}{activePools.reduce((sum, pool) => sum + Number(pool.utilized_limit || 0), 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mt-8 border-b border-white/5 pb-2 mb-4">
        <h2 className="text-xl font-bold text-main">All Accounts</h2>
      </div>


      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard type="simple" />
          <SkeletonCard type="simple" />
          <SkeletonCard type="credit" />
        </div>
      ) : error ? (
        <ErrorState 
          title="Account Loading Failed" 
          message="Failed to connect to the financial ledger server. Check your connection or retry below." 
          onRetry={fetchAccounts} 
        />
      ) : standaloneAccounts.length === 0 ? (

        <EmptyState 
          variant="dashed"
          icon={Building2}
          title="No Accounts Yet"
          description="Add your bank accounts, credit cards, or wallets to start tracking your finances across all your sources."
          actionText="Add Your First Account"
          onAction={openAdd}
        />
      ) : (




        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">          {standaloneAccounts.map(acc => {
            const config = typeConfig[acc.type] || typeConfig.bank;
            const Icon = config.icon;

            // Pre-calculate Credit Card statistics
            const isLinked = !!acc.credit_pool_id;
            const parentPool = isLinked ? creditPools.find(p => p.id === acc.credit_pool_id) : null;
            const poolAvailable = parentPool ? Number(parentPool.available_limit || 0) : 0;
            const cardCeiling = Number(acc.card_ceiling_limit || acc.credit_limit || 0);
            const cardOutstanding = Number(acc.card_outstanding || 0);
            const cardAvailable = Math.max(0, cardCeiling - cardOutstanding);
            const usableNow = isLinked ? Math.min(poolAvailable, cardAvailable) : cardAvailable;
            const utilizationPercent = (cardOutstanding / (cardCeiling || 1)) * 100;
            const cycle = calculateBillingCycle(acc);

            // Pre-calculate Simple Account statistics & activities
            const spend = Number(sourceStats[acc.id]?.monthlySpend || 0);
            const income = Number(sourceStats[acc.id]?.monthlyIncome || 0);
            const sourceTx = transactions
              .filter(t => t.source_id === acc.id)
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 2);

            const skinStyles = {
              bank: 'bg-gradient-to-br from-cyan-600/15 to-blue-900/20 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)] hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]',
              credit_card: 'bg-gradient-to-br from-violet-600/15 to-purple-900/20 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:shadow-[0_0_25px_rgba(168,85,247,0.1)]',
              wallet: 'bg-gradient-to-br from-indigo-600/15 to-slate-900/20 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)] hover:shadow-[0_0_25px_rgba(99,102,241,0.1)]',
              cash: 'bg-gradient-to-br from-emerald-600/15 to-teal-900/20 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_25px_rgba(16,185,129,0.1)]',
              debit_card: 'bg-gradient-to-br from-blue-600/15 to-slate-900/20 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:shadow-[0_0_25px_rgba(59,130,246,0.1)]'
            };
            const activeSkin = skinStyles[acc.type] || skinStyles.bank;

            return (
              <div key={acc.id} className={`card
              p-5
              transition-all
              group
              flex
              flex-col
              min-h-[265px]
              ${activeSkin}
            `}>


                <div>
                  <div className="flex items-start justify-between mb-5">

                    {/* Left */}
                    <div className="flex items-center gap-2.5 min-w-0">

                      {/* Icon */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${acc.type === 'wallet'
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          : acc.type === 'cash'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-white/5 border-white/10 text-main'
                          }
      `}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Name + Type */}
                      <div className="min-w-0 flex-1">
                        {inlineEditing.id === acc.id && inlineEditing.field === 'name' ? (
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                            onBlur={() => handleInlineSave(acc, 'name', inlineEditing.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineSave(acc, 'name', inlineEditing.value);
                              if (e.key === 'Escape') setInlineEditing({ id: null, field: null, value: '' });
                            }}
                            className="bg-slate-900 border border-primary/45 rounded px-2 py-0.5 text-main text-base focus:ring-2 focus:ring-primary focus:outline-none w-full"
                            autoFocus
                          />
                        ) : (
                          <h3
                            className="text-lg font-semibold text-main leading-snug cursor-pointer hover:text-primary transition-colors flex items-center gap-1 group/name"
                            title="Double-click to edit name"
                            onDoubleClick={() => setInlineEditing({ id: acc.id, field: 'name', value: acc.name })}
                          >
                            <span className="truncate">{acc.name}</span>
                            <Edit className="w-3.5 h-3.5 opacity-0 group-hover/name:opacity-50 transition-opacity shrink-0" />
                          </h3>
                        )}

                        <div className="text-xs font-medium text-muted uppercase tracking-wider mt-1">
                          {config.label}
                        </div>
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-2">

                      <button
                        onClick={() => openEdit(acc)}
                        className="p-1.5 text-muted hover:text-main rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteTarget(acc)}
                        className="p-1.5 text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                  <div className="flex flex-wrap gap-2 mt-1 mb-4">

                    {acc.account_subtype && (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide">
                        {acc.account_subtype}
                      </span>
                    )}

                    {acc.network && (
                      <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-semibold uppercase tracking-wide">
                        {acc.network}
                      </span>
                    )}

                    {acc.type === 'wallet' && (
                      <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-semibold uppercase tracking-wide">
                        Wallet
                      </span>
                    )}

                    {acc.type === 'cash' && (
                      <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-semibold uppercase tracking-wide">
                        Cash
                      </span>
                    )}

                    {acc.credit_pool_id && (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        Linked to Pool
                      </span>
                    )}

                  </div>


                  {acc.type === 'credit_card' ? (
                    <div className="space-y-3 flex-1 flex flex-col relative overflow-hidden">
                      {/* Decorative Background Icon for Credit Card */}
                      <Icon className="absolute -bottom-8 -right-8 w-32 h-32 text-main opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />

                      {/* Card Number */}
                      <div className="text-sm text-muted tracking-widest">
                        XXXX XXXX XXXX {acc.account_number_last4 || '0000'}
                      </div>

                      {/* Financial Limits */}
                      {isLinked ? (
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-xs text-muted font-medium">Usable Now</span>
                            <span className="text-lg font-bold text-emerald-400">{currencySymbol}{usableNow.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Shared Available Limit</span>
                            <span className="font-medium text-main">{currencySymbol}{poolAvailable.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Card Available Limit</span>
                            <span className="font-medium text-main">{currencySymbol}{cardAvailable.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                            <span className="text-muted">Card Total Limit</span>
                            <span className="font-medium text-main">{currencySymbol}{cardCeiling.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-muted mb-1">Available Limit</div>
                          <div className="text-2xl font-bold tracking-tight text-main">
                            {currencySymbol}{cardAvailable.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {/* Progress */}
                      <div className="mt-auto pt-3">
                        {/* Used Amount */}
                        <div className="flex justify-between text-xs text-muted mb-1">
                          <span>Outstanding Balance</span>
                          <span>
                            {currencySymbol}{cardOutstanding.toFixed(2)} {' / '} {currencySymbol}{cardCeiling.toFixed(2)}
                          </span>
                        </div>

                        {/* Utilization + Due */}
                        <div className="flex justify-between items-center mt-2 mb-2">
                          {/* Utilization */}
                          <div
                            className={`text-xs font-medium ${
                              utilizationPercent < 30 ? 'text-emerald-400'
                              : utilizationPercent < 70 ? 'text-blue-400'
                              : 'text-red-400'
                            }`}
                          >
                            {utilizationPercent.toFixed(0)}% Utilized
                          </div>

                          {/* Smart Billing + Due Dates — Active Cycle First */}
                          {cycle && (
                            <div className="flex items-center gap-4 flex-wrap justify-end">

                              {/* Active Payable Due — PRIMARY */}
                              <div className={`text-[11px] font-medium ${cycle.dueColor}`}>
                                {cycle.isOverdue
                                  ? `Overdue ${cycle.daysPastDue}d`
                                  : `Due in ${cycle.daysRemaining}d`
                                }
                              </div>

                              {/* Active Due Date */}
                              <div className={`text-[11px] ${cycle.dueColor}`}>
                                Due:{' '}
                                {cycle.activePayableDue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>

                              {/* Next Statement */}
                              <div className="text-[11px] text-muted">
                                Stmt:{' '}
                                {cycle.nextStatementDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>

                            </div>
                          )}



                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              utilizationPercent >= 70 ? 'bg-red-500 dark:bg-red-400'
                              : utilizationPercent >= 30 ? 'bg-blue-500 dark:bg-blue-400'
                              : 'bg-green-500 dark:bg-green-400'
                            }`}
                            style={{
                              width: `${Math.min(utilizationPercent, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Smart Alerts */}
                      <div className="flex flex-wrap gap-2 mt-3">

                          {/* Due Soon / Overdue */}
                          {(() => {
                            if (!cycle) return null;

                            // No payment alerts needed if there is no outstanding balance
                            if (Number(acc.card_outstanding || 0) <= 0) {
                              return null;
                            }

                            if (cycle.isOverdue) {
                              return (
                                <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold">
                                  Payment Overdue
                                </div>
                              );
                            }

                            if (cycle.daysRemaining <= 3) {
                              return (
                                <div className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-semibold">
                                  Payment Due Soon
                                </div>
                              );
                            }

                            return null;
                          })()}

                          {/* High Utilization */}
                          {(() => {

                            const usedPercentage =
                              (
                                Number(acc.card_outstanding || 0) /
                                Number(acc.card_ceiling_limit || acc.credit_limit || 1)
                              ) * 100;

                            if (usedPercentage >= 70) {

                              return (
                                <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold">
                                  High Credit Usage
                                </div>
                              );

                            }

                            return null;

                          })()}

                          {/* Low Available Credit */}
                          {(() => {

                            const ceiling = Number(acc.card_ceiling_limit || acc.credit_limit || 1);
                            const availablePercentage = (Math.max(0, ceiling - Number(acc.card_outstanding || 0)) / ceiling) * 100;

                            if (availablePercentage <= 20) {

                              return (
                                <div className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-semibold">
                                  Low Available Credit
                                </div>
                              );

                            }

                            return null;

                          })()}

                        </div>

                      {/* STATS FOOTER (Real-time analytics for Credit Card) */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.03] relative z-10">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted uppercase tracking-wider font-semibold opacity-60">Monthly Spend</span>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-danger">
                            <ArrowDownRight className="w-3 h-3" />
                            {currencySymbol}{Number(sourceStats[acc.id]?.monthlySpend || 0).toFixed(0)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-muted uppercase tracking-wider font-semibold opacity-60">Activity</span>
                          <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
                            <Clock className="w-2.5 h-2.5 opacity-50" />
                            {sourceStats[acc.id]?.lastActivity || 'No data'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 flex flex-col justify-between relative overflow-hidden">
                      {/* Decorative Background Icon for simple cards */}
                      <Icon className="absolute -bottom-8 -right-8 w-32 h-32 text-main opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />

                      <div className="space-y-2.5 relative z-10 flex-1 flex flex-col">
                        
                        {/* Available Balance - styled like "Usable Now" for Credit Cards */}
                        <div className="bg-emerald-500/[0.03] border border-emerald-500/10 p-2.5 rounded-xl flex justify-between items-center mb-1">
                          <span className="text-[11px] text-muted font-bold uppercase tracking-wider">Available Balance</span>
                          <span className="text-lg font-extrabold text-emerald-400">
                            {currencySymbol}{Number(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* DETAILED PROPERTIES GRID (Fits snugly) */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-white/[0.01] border border-white/5 rounded-xl text-xs">
                          
                          {/* BANK ACCOUNT GRID */}
                          {acc.type === 'bank' && (
                            <>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Institution</span>
                                <span className="font-semibold text-main truncate block">{acc.bank_name || 'Bank Account'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Account Type</span>
                                <span className="font-semibold text-main truncate block capitalize">{acc.account_subtype || 'Savings'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Account Holder</span>
                                {inlineEditing.id === acc.id && inlineEditing.field === 'account_holder_name' ? (
                                  <input
                                    type="text"
                                    value={inlineEditing.value}
                                    onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                                    onBlur={() => handleInlineSave(acc, 'account_holder_name', inlineEditing.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineSave(acc, 'account_holder_name', inlineEditing.value);
                                      if (e.key === 'Escape') setInlineEditing({ id: null, field: null, value: '' });
                                    }}
                                    className="bg-slate-900 border border-primary/45 rounded px-1.5 py-0.5 text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none w-full"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="font-semibold text-main truncate block capitalize cursor-pointer hover:text-primary transition-colors"
                                    onDoubleClick={() => setInlineEditing({ id: acc.id, field: 'account_holder_name', value: acc.account_holder_name || '' })}
                                    title="Double-click to edit account holder name"
                                  >
                                    {acc.account_holder_name || 'Personal'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Account No.</span>
                                <div className="flex items-center gap-1 justify-between">
                                  <span className="font-semibold text-main truncate block">•••• {acc.account_number_last4 || '0000'}</span>
                                  {acc.account_number_last4 && (
                                    <button
                                      onClick={() => handleCopy(acc.account_number_last4, acc.id, 'account_number_last4')}
                                      className="p-0.5 hover:bg-white/5 rounded transition-all transform active:scale-95 text-muted hover:text-main"
                                    >
                                      {copiedField.id === acc.id && copiedField.field === 'account_number_last4' ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* WALLET GRID */}
                          {acc.type === 'wallet' && (
                            <>
                              <div className="col-span-2">
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">UPI Virtual Address</span>
                                <div className="flex items-center gap-1.5 justify-between">
                                  {inlineEditing.id === acc.id && inlineEditing.field === 'upi_id' ? (
                                    <input
                                      type="text"
                                      value={inlineEditing.value}
                                      onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                                      onBlur={() => handleInlineSave(acc, 'upi_id', inlineEditing.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineSave(acc, 'upi_id', inlineEditing.value);
                                        if (e.key === 'Escape') setInlineEditing({ id: null, field: null, value: '' });
                                      }}
                                      className="bg-slate-900 border border-primary/45 rounded px-2 py-0.5 text-main font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none w-full"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="font-semibold text-main font-mono truncate block bg-white/5 px-2 py-0.5 rounded border border-white/5 cursor-pointer hover:border-primary/20 flex-1"
                                      onDoubleClick={() => setInlineEditing({ id: acc.id, field: 'upi_id', value: acc.upi_id || '' })}
                                      title="Double-click to edit UPI ID"
                                    >
                                      {acc.upi_id || 'No UPI ID'}
                                    </span>
                                  )}
                                  {acc.upi_id && (
                                    <button
                                      onClick={() => handleCopy(acc.upi_id, acc.id, 'upi_id')}
                                      className="p-1 hover:bg-white/5 rounded transition-all transform active:scale-95 text-muted hover:text-main"
                                    >
                                      {copiedField.id === acc.id && copiedField.field === 'upi_id' ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Linked Network</span>
                                <span className="font-semibold text-main truncate block">{acc.linked_bank_name || 'Associated Bank'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Transfer Class</span>
                                <span className="font-semibold text-purple-400 truncate block flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                  Instant UPI
                                </span>
                              </div>
                            </>
                          )}

                          {/* CASH GRID */}
                          {acc.type === 'cash' && (
                            <>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Asset Label</span>
                                {inlineEditing.id === acc.id && inlineEditing.field === 'cash_label' ? (
                                  <input
                                    type="text"
                                    value={inlineEditing.value}
                                    onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                                    onBlur={() => handleInlineSave(acc, 'cash_label', inlineEditing.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineSave(acc, 'cash_label', inlineEditing.value);
                                      if (e.key === 'Escape') setInlineEditing({ id: null, field: null, value: '' });
                                    }}
                                    className="bg-slate-900 border border-primary/45 rounded px-1.5 py-0.5 text-main text-xs focus:ring-1 focus:ring-primary focus:outline-none w-full"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="font-semibold text-main truncate block cursor-pointer hover:text-primary transition-colors"
                                    onDoubleClick={() => setInlineEditing({ id: acc.id, field: 'cash_label', value: acc.cash_label || '' })}
                                    title="Double-click to edit cash label"
                                  >
                                    {acc.cash_label || 'Physical Cash'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Liquidity Class</span>
                                <span className="font-semibold text-emerald-400 truncate block">Immediate Liquid</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Vault Status</span>
                                <span className="font-semibold text-yellow-400 truncate block flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                  Manual Ledger
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Tracking Mode</span>
                                <span className="font-semibold text-main truncate block">Self-Managed</span>
                              </div>
                            </>
                          )}

                          {/* DEBIT CARD GRID */}
                          {acc.type === 'debit_card' && (
                            <>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Linked Bank</span>
                                <span className="font-semibold text-main truncate block">{acc.bank_name || 'Linked Bank'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Network Brand</span>
                                <span className="font-semibold text-purple-400 truncate block uppercase">{acc.network || 'Visa'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Limit Scope</span>
                                <span className="font-semibold text-main truncate block">POS & ATM Bound</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-muted block mb-0.5">Card Number</span>
                                <div className="flex items-center gap-1 justify-between">
                                  <span className="font-semibold text-main truncate block">•••• {acc.account_number_last4 || '0000'}</span>
                                  {acc.account_number_last4 && (
                                    <button
                                      onClick={() => handleCopy(acc.account_number_last4, acc.id, 'account_number_last4_debit')}
                                      className="p-0.5 hover:bg-white/5 rounded transition-all transform active:scale-95 text-muted hover:text-main"
                                    >
                                      {copiedField.id === acc.id && copiedField.field === 'account_number_last4_debit' ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* LIVE RECENT ACTIVITY MINI-LEDGER */}
                        <div className="space-y-1 mt-0.5">
                          <div className="text-[9px] font-bold text-muted uppercase tracking-wider opacity-60">Recent Activity</div>
                          {sourceTx.length > 0 ? (
                            <div className="space-y-1">
                              {sourceTx.map(tx => {
                                const isIncome = tx.type === 'income';
                                return (
                                  <div key={tx.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors text-[10px]">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <div className="font-semibold text-main truncate leading-tight">{tx.description}</div>
                                      <div className="text-[8px] text-muted truncate capitalize">{tx.category || 'general'}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className={`font-bold ${isIncome ? 'text-emerald-400' : 'text-main'}`}>
                                        {isIncome ? '+' : '-'}{currencySymbol}{Number(tx.amount).toFixed(0)}
                                      </div>
                                      <div className="text-[8px] text-muted leading-tight">
                                        {dayjs(tx.timestamp).format('DD MMM')}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-2 px-3 rounded-lg border border-dashed border-white/5 text-center text-[9px] text-muted font-medium bg-white/[0.005]">
                              No recent ledger activity
                            </div>
                          )}
                        </div>

                        {/* MONTHLY CASHFLOW TRACKER (Income vs Expense comparison) */}
                        <div className="grid grid-cols-2 gap-2 mt-0.5 bg-white/[0.01] border border-white/5 p-2 rounded-xl text-[10px]">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-muted uppercase tracking-wider font-semibold opacity-50">30d Income</span>
                            <div className="flex items-center gap-0.5 text-emerald-400 font-bold mt-0.5">
                              <ArrowUpRight className="w-2.5 h-2.5" />
                              {currencySymbol}{income.toFixed(0)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] text-muted uppercase tracking-wider font-semibold opacity-50">30d Outflow</span>
                            <div className="flex items-center gap-0.5 text-rose-400 font-bold mt-0.5">
                              <ArrowDownRight className="w-2.5 h-2.5" />
                              {currencySymbol}{spend.toFixed(0)}
                            </div>
                          </div>
                        </div>

                        {/* INTERACTIVE ACTION STRIP (Gives quick controls inline) */}
                        <div className="flex gap-2 mt-1 pt-1.5 border-t border-white/5 relative z-10">
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(acc); }}
                            className="flex-1 py-1 px-2 text-[9px] font-bold text-muted hover:text-main bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg transition-all duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <Edit className="w-3 h-3" />
                            Manage
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(acc); }}
                            className="flex-1 py-1 px-2 text-[9px] font-bold text-muted hover:text-danger bg-white/5 hover:bg-danger/10 border border-white/5 hover:border-danger/10 rounded-lg transition-all duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>

                      </div>

                      {/* STATS FOOTER (The "Potential" realized) */}
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/[0.03] relative z-10">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted uppercase tracking-wider font-semibold opacity-60">Monthly Spend</span>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-danger">
                            <ArrowDownRight className="w-3 h-3" />
                            {currencySymbol}{Number(sourceStats[acc.id]?.monthlySpend || 0).toFixed(0)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-muted uppercase tracking-wider font-semibold opacity-60">Activity</span>
                          <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
                            <Clock className="w-2.5 h-2.5 opacity-50" />
                            {sourceStats[acc.id]?.lastActivity || 'No data'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}




                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Account" : "Add Account"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formData.type !== 'cash' && (
            <div>

              <label className="block text-sm font-medium text-muted mb-1">
                Account Name
              </label>

              <input
                required
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData({
                    ...formData,
                    name: e.target.value
                  })
                }
                className="input-field"
                placeholder="e.g. Salary Account"
              />

            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Account Type</label>
            <CustomSelect
              value={formData.type}
              onChange={v => setFormData({ ...formData, type: v })}
              options={[
                { value: 'bank',        label: 'Bank Account' },
                { value: 'credit_card', label: 'Credit Card' },
                { value: 'debit_card',  label: 'Debit Card' },
                { value: 'wallet',      label: 'Digital Wallet' },
                { value: 'cash',        label: 'Cash' },
              ]}
            />
          </div>
          {/* Show only for NON credit cards */}

          {formData.type !== 'credit_card' && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Starting Balance
              </label>

              <input
                required
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={e =>
                  setFormData({
                    ...formData,
                    balance: e.target.value
                  })
                }
                className="input-field"
                placeholder="0.00"
              />
            </div>
          )}

          {/* BANK ACCOUNT FIELDS */}

          {formData.type === 'bank' && (
            <div className="space-y-4">

              {/* Account Holder */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Account Holder Name
                </label>

                <input
                  type="text"
                  value={formData.account_holder_name}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      account_holder_name: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="Mahesh Rangala"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Bank Name
                </label>

                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      bank_name: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="SBI"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Account Type
                </label>

                <CustomSelect
                  value={formData.account_subtype}
                  onChange={v => setFormData({ ...formData, account_subtype: v })}
                  placeholder="Select Type"
                  options={[
                    { value: '',        label: 'Select Type' },
                    { value: 'savings', label: 'Savings' },
                    { value: 'current', label: 'Current' },
                    { value: 'salary',  label: 'Salary' },
                  ]}
                />
              </div>

              {/* Last 4 Digits */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Last 4 Digits
                </label>

                <input
                  type="text"
                  maxLength={4}
                  value={formData.account_number_last4}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      account_number_last4: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="4821"
                />
              </div>

            </div>
          )}
          {/* WALLET FIELDS */}

          {formData.type === 'wallet' && (
            <div className="space-y-4">

              {/* UPI ID */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  UPI ID
                </label>

                <input
                  type="text"
                  value={formData.upi_id}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      upi_id: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="mahesh@axl"
                />
              </div>


              {/* Linked Bank */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Linked Bank
                </label>

                <input
                  type="text"
                  value={formData.linked_bank_name}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      linked_bank_name: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="SBI"
                />
              </div>

            </div>
          )}

          {/* DEBIT CARD FIELDS */}

          {formData.type === 'debit_card' && (
            <div className="space-y-4">

              {/* Linked Bank */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Linked Bank
                </label>

                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      bank_name: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="SBI"
                />
              </div>

              {/* Last 4 Digits */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Last 4 Digits
                </label>

                <input
                  type="text"
                  maxLength={4}
                  value={formData.account_number_last4}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      account_number_last4: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="4821"
                />
              </div>

            </div>
          )}
          {/* CASH ACCOUNT */}

          {formData.type === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Cash Label
              </label>

              <input
                type="text"
                value={formData.cash_label}
                onChange={e =>
                  setFormData({
                    ...formData,
                    cash_label: e.target.value
                  })
                }
                className="input-field"
                placeholder="Emergency Cash"
              />
            </div>
          )}



          {/* CREDIT CARD EXTRA FIELDS */}

          {formData.type === 'credit_card' && (
            <div className="space-y-4">

              {/* Card Network */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Card Network
                </label>

                <CustomSelect
                  value={formData.network}
                  onChange={v => setFormData({ ...formData, network: v })}
                  placeholder="Select Network"
                  options={[
                    { value: '',           label: 'Select Network' },
                    { value: 'visa',       label: 'Visa' },
                    { value: 'mastercard', label: 'Mastercard' },
                    { value: 'rupay',      label: 'RuPay' },
                    { value: 'amex',       label: 'Amex' },
                  ]}
                />
              </div>

              {/* Statement Day */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Statement Day (1-31)
                </label>

                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.statement_day === undefined || formData.statement_day === null ? '' : formData.statement_day}
                  onChange={(e) => setFormData({ ...formData, statement_day: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                  className="input-field"
                />
                <p className="text-[10px] text-muted mt-1">The calendar day of the month when your statement is generated.</p>
              </div>
              {/* Due Day */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Due Day (1-31)
                </label>

                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_day === undefined || formData.due_day === null ? '' : formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                  className="input-field"
                />
                <p className="text-[10px] text-muted mt-1">The calendar day of the month when the credit card payment is due.</p>
              </div>

              {/* Card Limit (Operational Ceiling) */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5 flex justify-between">
                  <span>Card Usable Limit</span>
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={formData.card_ceiling_limit}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      card_ceiling_limit: e.target.value,
                      credit_limit: formData.credit_limit || e.target.value // default master limit to this if not set
                    })
                  }
                  className="input-field"
                  placeholder="e.g. 50000"
                  required
                />
                <p className="text-[10px] text-muted mt-1">The maximum amount this specific card can use (operational ceiling).</p>
              </div>

              {/* Advanced: Master Issuer Limit */}
              {isAdvancedCredit && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5 flex justify-between">
                    <span>Shared Pool Limit (Master Limit)</span>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        credit_limit: e.target.value
                      })
                    }
                    className="input-field"
                    placeholder="e.g. 500000"
                  />
                  <p className="text-[10px] text-muted mt-1">The total combined issuer-approved limit shared across linked cards.</p>
                </div>
              )}

              {/* Current Outstanding Balance */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5 flex justify-between">
                  <span>Outstanding Balance</span>
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      balance: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="e.g. 15000"
                />
                <p className="text-[10px] text-muted mt-1">The currently utilized amount on this card. Leave empty if 0 balance.</p>
              </div>

              {/* Advanced Credit Toggle */}
              {creditPools.length > 0 && (
                <div className="pt-4 mt-2 border-t border-white/5">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={isAdvancedCredit}
                      onChange={(e) => {
                        setIsAdvancedCredit(e.target.checked);
                        if (!e.target.checked) setFormData({ ...formData, credit_pool_id: '' });
                      }}
                      className="form-checkbox text-primary h-5 w-5 rounded bg-dark border-white/20 focus:ring-primary focus:ring-offset-dark"
                    />
                    <div>
                      <div className="text-sm font-medium text-main">Shared Credit Limit</div>
                      <div className="text-[10px] text-muted">This card shares a total credit limit with other linked cards.</div>
                    </div>
                  </label>

                  {isAdvancedCredit && (
                    <div className="mt-4 p-4 bg-dark/50 rounded-xl border border-primary/20 space-y-3">
                      <label className="block text-sm font-medium text-muted mb-1.5">
                        Select Shared Credit Pool
                      </label>
                      <CustomSelect
                        value={formData.credit_pool_id}
                        onChange={v => setFormData({ ...formData, credit_pool_id: v })}
                        placeholder="Select Pool"
                        options={[
                          { value: '', label: 'Select Pool' },
                          ...creditPools.map(p => ({ value: p.id, label: `${p.name} (${currencySymbol}${p.total_limit})` }))
                        ]}
                      />
                      <p className="text-xs text-primary/80 leading-relaxed">
                        When linked, the Total Limit and Available Limit will be automatically synchronized from the shared pool.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Last 4 Digits */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Last 4 Digits
                </label>

                <input
                  type="text"
                  maxLength={4}
                  value={formData.account_number_last4}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      account_number_last4: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="1234"
                  required
                />
              </div>

            </div>
          )}
          <div className="pt-4 border-t border-white/5 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Account</button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Account"
      >

        <div className="space-y-5">

          <p className="text-sm text-muted leading-relaxed">

            Are you sure you want to delete

            <span className="text-main font-semibold">
              {' '}
              {deleteTarget?.name}
            </span>

            ?

            Transactions linked to this account may be affected.

          </p>

          <div className="flex justify-end gap-3 pt-2">

            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              className="btn-danger"
            >
              Delete Account
            </button>

          </div>

        </div>

      </Modal>
      <Modal
        isOpen={!!deletePoolTarget}
        onClose={() => setDeletePoolTarget(null)}
        title="Delete Credit Pool"
      >
        <div className="space-y-5">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-200 leading-relaxed font-medium">
                Are you sure you want to delete <span className="font-bold text-red-400">{deletePoolTarget?.name}</span>?
              </p>
              <p className="text-xs text-red-300 mt-1">
                Any linked credit cards will safely preserve their current limits, but will no longer share a pooled limit.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeletePoolTarget(null)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handlePoolDelete} className="btn-danger">
              Delete Pool
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        title={editingPoolId ? "Edit Credit Pool" : "Create Credit Pool"}
      >
        <form onSubmit={handlePoolSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Pool Name</label>
            <input
              type="text"
              value={poolFormData.name}
              onChange={e => setPoolFormData({ ...poolFormData, name: e.target.value })}
              className="input-field"
              placeholder="e.g. HDFC Shared Limit"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 flex justify-between">
              <span>Total Shared Limit</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={poolFormData.total_limit}
              onChange={e => setPoolFormData({ ...poolFormData, total_limit: e.target.value })}
              className="input-field"
              placeholder="500000"
              required
            />
          </div>
          {/* Advanced Options Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvancedPool(!showAdvancedPool)}
              className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              <span>{showAdvancedPool ? 'Hide Advanced Options' : 'Show Advanced Options (Outstanding Balance & Reconciliation)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAdvancedPool ? 'rotate-180' : ''}`} />
            </button>

            {showAdvancedPool && (
              <div className="mt-3 p-3 bg-white/[0.01] border border-white/5 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5 flex justify-between">
                    <span>Current Outstanding Balance (Utilized Limit)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={poolFormData.utilized_limit}
                    onChange={e => setPoolFormData({ ...poolFormData, utilized_limit: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 35000"
                  />
                  {editingPoolId ? (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[11px] text-yellow-300">
                      <strong>Admin Disclosure:</strong> Manually editing the utilized limit bypasses transactional summing and can cause sync mismatches with linked cards. Use only for manual correction or reconciliation.
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted mt-1">Specify only if onboarding a pool with an active outstanding balance.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Statement Day</label>
              <CustomSelect
                value={poolFormData.statement_day}
                onChange={v => setPoolFormData({ ...poolFormData, statement_day: Number(v) })}
                options={Array.from({ length: 31 }, (_, i) => ({ 
                  value: i + 1, 
                  label: `${i + 1}${i + 1 === 1 || i + 1 === 21 || i + 1 === 31 ? 'st' : i + 1 === 2 || i + 1 === 22 ? 'nd' : i + 1 === 3 || i + 1 === 23 ? 'rd' : 'th'} of the month` 
                }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Due Day</label>
              <CustomSelect
                value={poolFormData.due_day}
                onChange={v => setPoolFormData({ ...poolFormData, due_day: Number(v) })}
                options={Array.from({ length: 31 }, (_, i) => ({ 
                  value: i + 1, 
                  label: `${i + 1}${i + 1 === 1 || i + 1 === 21 || i + 1 === 31 ? 'st' : i + 1 === 2 || i + 1 === 22 ? 'nd' : i + 1 === 3 || i + 1 === 23 ? 'rd' : 'th'} of the month` 
                }))}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsPoolModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingPoolId ? 'Save Changes' : 'Create Pool'}</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

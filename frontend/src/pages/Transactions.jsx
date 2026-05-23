import { useState, useEffect, useMemo } from 'react';
import { Plus, Receipt, Search, ArrowUpRight, ArrowDownRight, Edit, Trash2, RefreshCw, Copy, Repeat2, Clipboard, Clock, AlertCircle, CreditCard, Tag, Database, Shield, Info } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import api from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import PremiumDatePicker from '../components/PremiumDatePicker';
import ExportMenu from '../components/ExportMenu';
import { BRANDING } from '../config/branding';
import LoadingScreen from '../components/LoadingScreen';
import { SkeletonLedger } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import { Link } from 'react-router-dom';


const EMPTY_FORM = {
  amount: '',
  type: 'expense',
  source_id: '',
  category_id: '',
  notes: '',
  timestamp: '',
  is_recurring: false,
  recurring_interval: '',
  repayment_target_id: '',
  repayment_funding_id: '',
  repayment_type: 'full',
};

const getTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};

const getCurrentLocalTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
};

const parseValidationMessage = (msg) => {
  if (!msg) return { isTimelineError: false };
  const regex = /^(Insufficient funds|Limit exceeded|Shared pool limit exceeded|Spending power exceeded):\s+(?:Your|The)\s+(?:balance|available credit limit|actual spendable credit|available pool limit)\s+on\s+(\d{2}\/\d{2}\/\d{4})\s+was\s+₹([\d,\.]+),\s+which\s+is\s+insufficient\s+for\s+this\s+₹([\d,\.]+)\s+transaction\./i;
  const match = msg.match(regex);
  if (match) {
    return {
      isTimelineError: true,
      category: match[1],
      date: match[2],
      availableAmount: match[3],
      attemptedAmount: match[4]
    };
  }
  return { isTimelineError: false };
};

const isToday = (dateString) => dateString === getTodayDate();

const convertTo24Hour = (time12h) => {
  if (!time12h) return '00:00';
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
  return `${hours.padStart(2,'0')}:${minutes}`;
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [manualTime, setManualTime] = useState('');
  const [showClock, setShowClock] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const handleSeedDemoData = async () => {
    setIsSeedingDemo(true);
    try {
      await api.post('/users/seed-demo-data');
      addToast('Demo workspace populated successfully!', 'success');
      setIsModalOpen(false);
      await fetchData();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to seed demo data', 'error');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Filters
  const [searchTerm,        setSearchTerm]        = useState('');
  const [selectedSource,    setSelectedSource]    = useState('all');
  const [selectedType,      setSelectedType]      = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [customFromDate,    setCustomFromDate]     = useState('');
  const [customToDate,      setCustomToDate]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState('all');
  const [amountMin,         setAmountMin]         = useState('');
  const [amountMax,         setAmountMax]         = useState('');
  const [recurringOnly,     setRecurringOnly]     = useState(false);

  const { addToast } = useToast();
  const { user } = useAuth();
  const [safetyAlert, setSafetyAlert] = useState(null);
  const [showTimelineDetails, setShowTimelineDetails] = useState(false);
  const [showDateTooltip, setShowDateTooltip] = useState(false);

  const presets = [
    { label: '🛒 Groceries', category: 'Groceries', type: 'expense' },
    { label: '🍔 Dining', category: 'Dining', type: 'expense' },
    { label: '🚗 Transit', category: 'Transit', type: 'expense' },
    { label: '⚡ Bills', category: 'Bills', type: 'expense' },
    { label: '🛍️ Shopping', category: 'Shopping', type: 'expense' }
  ];

  const applyPreset = (preset) => {
    const matchedCat = categories.find(c => c.name.toLowerCase().includes(preset.category.toLowerCase()));
    setFormData(prev => ({
      ...prev,
      type: preset.type,
      category_id: matchedCat ? matchedCat.id : prev.category_id
    }));
    addToast(`Preset applied: ${preset.category}`, 'info');
  };

  const onboardingDate = useMemo(() => {
    if (!user?.created_at) return null;
    return new Date(user.created_at);
  }, [user]);

  const onboardingDateStr = useMemo(() => {
    if (!onboardingDate) return '';
    return format(onboardingDate, 'dd/MM/yyyy');
  }, [onboardingDate]);

  const handleSaveError = (err, defaultMsg) => {
    const errorMsg = err.response?.data?.detail || defaultMsg;
    const parsed = parseValidationMessage(errorMsg);
    if (parsed.isTimelineError) {
      setSafetyAlert({
        message: errorMsg,
        ...parsed
      });
    } else {
      addToast(errorMsg, 'error');
    }
  };
  
  const { currencySymbol, theme, dateTimePreferences } = useSettings();
  const isDark = theme === 'dark';
  const dFormat = dateTimePreferences?.dateFormat || 'dd/MM/yyyy';
  const tFormat = dateTimePreferences?.timeFormat === '12h' ? 'hh:mm a' : 'HH:mm';

  // Filter categories by the currently-selected transaction type
  const filteredCategories = useMemo(
    () => categories.filter(c => c.type === formData.type),
    [categories, formData.type]
  );

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [txRes, srcRes, catRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/sources'),
        api.get('/categories'),
      ]);
      setTransactions([...txRes.data].sort((a, b) => {
        const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
        if (timeDiff !== 0) return timeDiff;
        const createdDiff = new Date(b.created_at) - new Date(a.created_at);
        if (createdDiff !== 0) return createdDiff;
        return b.id.localeCompare(a.id);
      }));
      setSources(srcRes.data);
      setCategories(catRes.data);
    } catch {
      setError(true);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    window.addEventListener('transactionAdded', fetchData);
    return () => window.removeEventListener('transactionAdded', fetchData);
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setManualTime('');
    setShowClock(false);
    setCustomCategory('');
    const nonCredit = sources.find(s => s.type !== 'credit_card');
    const credit = sources.find(s => s.type === 'credit_card');
    setFormData({
      ...EMPTY_FORM,
      source_id: sources[0]?.id || '',
      category_id: '',
      timestamp: getTodayDate(),
      repayment_funding_id: nonCredit?.id || '',
      repayment_target_id: credit?.id || '',
      repayment_type: 'full',
    });
    setIsModalOpen(true);
  };

  const openEdit = (tx) => {
    if (tx.notes?.includes('[Ref: CC_PAYMENT_')) {
      addToast('Repayments cannot be edited directly. Please delete and re-create the repayment.', 'info');
      return;
    }
    setEditingId(tx.id);
    setShowClock(false);
    setCustomCategory('');

    let localDateStr = getTodayDate();
    let localTimeStr = '';

    if (tx.timestamp) {
      const localDate = new Date(tx.timestamp);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      localDateStr = `${year}-${month}-${day}`;

      let hours = localDate.getHours();
      const minutes = String(localDate.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      localTimeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }

    setManualTime(localTimeStr);
    setFormData({
      amount: parseFloat(tx.amount).toString(),
      type: tx.type,
      source_id: tx.source_id,
      category_id: tx.category_id,
      notes: tx.notes || '',
      timestamp: localDateStr,
      repayment_funding_id: '',
      repayment_target_id: '',
      repayment_type: 'full',
    });
    setIsModalOpen(true);
  };

  const handleToggleClock = () => {
    if (!showClock && !manualTime) {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setManualTime(`${String(hours).padStart(2, '0')}:${minutes} ${ampm}`);
    }
    setShowClock(!showClock);
  };

  const buildTimestamp = (dateStr, time12h) => {
    if (isToday(dateStr) && !time12h) {
      return new Date().toISOString();
    }
    const parsedTime = convertTo24Hour(time12h);
    const [hours, minutes] = parsedTime.split(':').map(Number);
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, hours, minutes, 0);
    return localDate.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!isToday(formData.timestamp) && !manualTime) {
        addToast('Please select a time for previous date transactions', 'error');
        return;
      }

      if (formData.type === 'repayment') {
        if (!formData.repayment_funding_id || !formData.repayment_target_id) {
          addToast('Please select both a funding account and a target credit card.', 'error');
          return;
        }

        let repaymentCat = categories.find(c => c.name === 'Repayment');
        if (!repaymentCat) {
          const catRes = await api.post('/categories', {
            name: 'Repayment',
            type: 'expense',
            color: '#3B82F6',
            icon: 'credit-card',
          });
          repaymentCat = catRes.data;
        }

        const fundingName = sources.find(s => s.id === formData.repayment_funding_id)?.name || 'Account';
        const targetName = sources.find(s => s.id === formData.repayment_target_id)?.name || 'Credit Card';
        const refId = `CC_PAYMENT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        let repaymentLabel = '';
        if (formData.repayment_type === 'emi') {
          repaymentLabel = `EMI Repayment to ${targetName} from ${fundingName}`;
        } else if (formData.repayment_type === 'full') {
          repaymentLabel = `Full Bill Payment for ${targetName} from ${fundingName}`;
        } else if (formData.repayment_type === 'minimum') {
          repaymentLabel = `Minimum Due Payment for ${targetName} from ${fundingName}`;
        } else {
          repaymentLabel = `Credit Card Payment to ${targetName} from ${fundingName}`;
        }

        let firstLegRes;
        try {
          firstLegRes = await api.post('/transactions', {
            type: 'expense',
            source_id: formData.repayment_funding_id,
            category_id: repaymentCat.id,
            amount: Number(parseFloat(formData.amount).toFixed(2)),
            notes: `${repaymentLabel} [Ref: ${refId}]`,
            timestamp: buildTimestamp(formData.timestamp, manualTime),
          });
        } catch (err) {
          handleSaveError(err, 'Repayment failed: Funding account could not be charged.');
          return;
        }

        try {
          await api.post('/transactions', {
            type: 'repayment',
            source_id: formData.repayment_target_id,
            category_id: repaymentCat.id,
            amount: Number(parseFloat(formData.amount).toFixed(2)),
            notes: `${repaymentLabel} [Ref: ${refId}]`,
            timestamp: buildTimestamp(formData.timestamp, manualTime),
          });
          addToast('Repayment transaction completed successfully', 'success');
          setIsModalOpen(false);
          fetchData();
          window.dispatchEvent(new Event('transactionAdded'));
        } catch (err) {
          try {
            await api.delete(`/transactions/${firstLegRes.data.id}`);
          } catch (rollbackErr) {
            console.error('Failed to rollback first leg:', rollbackErr);
          }
          handleSaveError(err, 'Repayment failed: Destination credit card could not be credited. Rolled back funding charge.');
        }
        return;
      }

      let finalCategoryId = formData.category_id;
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      if (selectedCategory?.name === 'Others' && customCategory.trim()) {
        const res = await api.post('/categories', {
          name: customCategory, type: formData.type, color: '#6B7280', icon: 'circle',
        });
        finalCategoryId = res.data.id;
      }

      const payload = {
        ...formData,
        category_id: finalCategoryId,
        amount: Number(parseFloat(formData.amount).toFixed(2)),
        timestamp: buildTimestamp(formData.timestamp, manualTime),
      };

      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload);
        addToast('Transaction updated', 'success');
      } else {
        await api.post('/transactions', payload);
        addToast('Transaction added', 'success');
      }

      setCustomCategory('');
      setIsModalOpen(false);
      fetchData();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (err) {
      handleSaveError(err, 'Failed to save');
    }
  };

  const handleDelete = (id) => { setTransactionToDelete(id); setDeleteModalOpen(true); };

  const confirmDelete = async () => {
    try {
      const tx = transactions.find(t => t.id === transactionToDelete);
      const match = tx?.notes?.match(/\[Ref:\s*(CC_PAYMENT_[a-zA-Z0-9_\-]+)\]/);
      if (match) {
        const refId = match[1];
        const toDelete = transactions.filter(t => t.notes?.includes(refId));
        await Promise.all(toDelete.map(t => api.delete(`/transactions/${t.id}`)));
        addToast('Linked repayment transactions deleted successfully', 'success');
      } else {
        await api.delete(`/transactions/${transactionToDelete}`);
        addToast('Transaction deleted', 'success');
      }
      setDeleteModalOpen(false);
      setTransactionToDelete(null);
      fetchData();
      window.dispatchEvent(new Event('transactionAdded'));
    } catch {
      addToast('Failed to delete transaction', 'error');
    }
  };

  const getSourceName = (id) => sources.find(s => s.id === id)?.name || 'Unknown Account';
  const getCategoryDetails = (id) => categories.find(c => c.id === id) || { name: 'Unknown', color: '#9CA3AF' };

  // ─── Quick Actions ────────────────────────────────────────────────────────
  const duplicateTransaction = (tx) => {
    setFormData({
      amount: tx.amount,
      type: tx.type,
      source_id: tx.source_id,
      category_id: tx.category_id,
      notes: tx.notes || '',
      timestamp: getTodayDate(),
      is_recurring: false,
      recurring_interval: '',
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const convertToRecurring = (tx) => {
    setFormData({
      amount: tx.amount,
      type: tx.type,
      source_id: tx.source_id,
      category_id: tx.category_id,
      notes: tx.notes || '',
      timestamp: getTodayDate(),
      is_recurring: true,
      recurring_interval: tx.recurring_interval || 'monthly',
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const copyAmount = (tx) => {
    const text = `${currencySymbol}${parseFloat(tx.amount).toFixed(2)}`;
    navigator.clipboard.writeText(text).then(() => addToast(`Copied ${text}`, 'success'));
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryDetails(tx.category_id).name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getSourceName(tx.source_id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = selectedSource === 'all' || tx.source_id === selectedSource;
      const matchesType = selectedType === 'all' || tx.type === selectedType;

      let matchesDate = true;
      const txDate = new Date(tx.timestamp);
      const now = new Date();
      if (selectedDateRange === 'today') {
        matchesDate = txDate.toDateString() === now.toDateString();
      } else if (selectedDateRange === '7days') {
        const d = new Date(); d.setDate(now.getDate() - 7); matchesDate = txDate >= d;
      } else if (selectedDateRange === '30days') {
        const d = new Date(); d.setDate(now.getDate() - 30); matchesDate = txDate >= d;
      } else if (selectedDateRange === '3months') {
        const d = new Date(); d.setMonth(now.getMonth() - 3); matchesDate = txDate >= d;
      } else if (selectedDateRange === '6months') {
        const d = new Date(); d.setMonth(now.getMonth() - 6); matchesDate = txDate >= d;
      } else if (selectedDateRange === '1year') {
        const d = new Date(); d.setFullYear(now.getFullYear() - 1); matchesDate = txDate >= d;
      } else if (selectedDateRange === 'custom' && customFromDate && customToDate) {
        const from = new Date(customFromDate);
        const to = new Date(customToDate); to.setHours(23, 59, 59, 999);
        matchesDate = txDate >= from && txDate <= to;
      }

      const matchesCategory = selectedCategory === 'all' || tx.category_id === selectedCategory;
      const amount = parseFloat(tx.amount);
      const matchesAmountMin = amountMin === '' || amount >= parseFloat(amountMin);
      const matchesAmountMax = amountMax === '' || amount <= parseFloat(amountMax);
      const matchesRecurring = !recurringOnly || tx.is_recurring;

      return matchesSearch && matchesSource && matchesType && matchesDate
        && matchesCategory && matchesAmountMin && matchesAmountMax && matchesRecurring;
    });
  }, [transactions, searchTerm, selectedSource, selectedType, selectedDateRange, customFromDate, customToDate, selectedCategory, amountMin, amountMax, recurringOnly, sources, categories]);

  const clearFilters = () => {
    setSearchTerm(''); setSelectedSource('all'); setSelectedType('all');
    setSelectedDateRange('all'); setCustomFromDate(''); setCustomToDate('');
    setSelectedCategory('all'); setAmountMin(''); setAmountMax(''); setRecurringOnly(false);
  };

  const activeFilterCount = useMemo(() => {
    return [
      searchTerm, selectedSource !== 'all', selectedType !== 'all',
      selectedDateRange !== 'all', selectedCategory !== 'all',
      amountMin, amountMax, recurringOnly,
    ].filter(Boolean).length;
  }, [searchTerm, selectedSource, selectedType, selectedDateRange, selectedCategory, amountMin, amountMax, recurringOnly]);

  // ─── Filter label for export header ──────────────────────────────────────
  const filterLabel = useMemo(() => {
    const DATE_LABELS = {
      all: 'All Time', today: 'Today', '7days': 'Last 7 Days',
      '30days': 'Last 30 Days', '3months': 'Last 3 Months',
      '6months': 'Last 6 Months', '1year': 'Last 1 Year',
      custom: customFromDate && customToDate
        ? `${customFromDate} → ${customToDate}`
        : 'Custom Range',
    };
    return DATE_LABELS[selectedDateRange] ?? 'All Time';
  }, [selectedDateRange, customFromDate, customToDate]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 border-b border-white/5 pb-5">
        {/* Toolbar */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted z-10" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field !pl-12"
            />
          </div>

          <CustomSelect
            value={selectedSource}
            onChange={setSelectedSource}
            className="min-w-[160px]"
            options={[
              { value: 'all', label: 'All Accounts' },
              ...sources.map(s => ({ value: s.id, label: s.name }))
            ]}
          />

          <CustomSelect
            value={selectedType}
            onChange={setSelectedType}
            className="min-w-[130px]"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'repayment', label: 'Repayment' },
            ]}
          />

          <CustomSelect
            value={selectedDateRange}
            onChange={(v) => { setSelectedDateRange(v); if (v !== 'custom') { setCustomFromDate(''); setCustomToDate(''); } }}
            className="min-w-[150px]"
            options={[
              { value: 'all',     label: 'All Time' },
              { value: 'today',   label: 'Today' },
              { value: '7days',   label: 'Last 7 Days' },
              { value: '30days',  label: 'Last 30 Days' },
              { value: '3months', label: 'Last 3 Months' },
              { value: '6months', label: 'Last 6 Months' },
              { value: '1year',   label: 'Last 1 Year' },
              { value: 'custom',  label: 'Custom Range' },
            ]}
          />

          <button onClick={clearFilters} className="h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-[#0B1736] hover:bg-black/10 dark:hover:bg-[#0F1E46] text-main font-medium transition-all whitespace-nowrap shrink-0 text-sm flex items-center gap-2">
            Clear
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>

          {/* Export */}
          <ExportMenu
            transactions={filteredTransactions}
            sources={sources}
            categories={categories}
            currencySymbol={currencySymbol}
            filterLabel={filterLabel}
          />

          <button onClick={openAdd} className="btn-primary whitespace-nowrap flex items-center shrink-0">
            <Plus className="w-4 h-4 mr-2" />Add Transaction
          </button>
        </div>

        {/* Advanced filter row */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <CustomSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="min-w-[160px] max-w-[200px]"
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(c => ({ value: c.id, label: c.name }))
            ]}
          />

          <div className="flex items-center gap-2">
            <input
              type="number" placeholder="Min ₹" min="0" value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="input-field w-28"
            />
            <span className="text-muted text-sm">—</span>
            <input
              type="number" placeholder="Max ₹" min="0" value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="input-field w-28"
            />
          </div>

          <button
            type="button"
            onClick={() => setRecurringOnly(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
              recurringOnly
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'border-white/10 text-muted hover:border-white/20 hover:text-main'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recurring Only
          </button>
        </div>

        {/* Custom date range */}
        {selectedDateRange === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 mt-4">
            <div className="flex flex-col">
              <label className="text-xs text-muted mb-1">From</label>
              <PremiumDatePicker value={customFromDate} onChange={setCustomFromDate} maxDate={new Date()} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-muted mb-1">To</label>
              <PremiumDatePicker value={customToDate} onChange={setCustomToDate} maxDate={new Date()} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden" style={{ background: 'var(--surface)' }}>
        {loading ? (
          <SkeletonLedger />
        ) : error ? (
          <div className="p-6">
            <ErrorState 
              title="Ledger Loading Failed" 
              message="Failed to connect to the transaction ledger database. Check your network or retry below." 
              onRetry={fetchData} 
            />
          </div>
        ) : filteredTransactions.length === 0 ? (

          <EmptyState 
            icon={Receipt}
            title="No Transactions Found"
            description="You haven't tracked any spending or income yet."
            actionText="Track a Transaction"
            onAction={openAdd}
          />
        ) : (
          <div className="table-container">
            {/* Desktop View */}
            <table className="w-full text-left border-collapse table-compact hidden sm:table">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="p-4 text-xs font-medium text-muted uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-medium text-muted uppercase tracking-wider">Category</th>
                  <th className="p-4 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Account</th>
                  <th className="p-4 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Notes</th>
                  <th className="p-4 text-xs font-medium text-muted uppercase tracking-wider text-right">Amount</th>
                  <th className="p-4 text-xs font-medium text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map(tx => {
                  const isIncome = tx.type === 'income';
                  const isRepayment = tx.type === 'repayment';
                  const isPositive = isIncome || isRepayment;
                  const cat = getCategoryDetails(tx.category_id);
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-sm text-main whitespace-nowrap">
                      <span className="hidden sm:inline">{format(new Date(tx.timestamp), `${dFormat} ${tFormat}`)}</span>
                      <span className="sm:hidden">{format(new Date(tx.timestamp), dFormat)}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-main font-medium">{cat.name}</span>
                        {tx.is_recurring && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold hidden sm:inline-flex">
                            <RefreshCw className="w-2.5 h-2.5" />
                            {tx.recurring_interval || 'recurring'}
                          </span>
                        )}
                      </div>
                    </td>
                      <td className="p-4 text-sm text-muted hidden md:table-cell">{getSourceName(tx.source_id)}</td>
                      <td className="p-4 text-sm text-muted max-w-[200px] truncate hidden lg:table-cell" title={tx.notes}>{tx.notes || '-'}</td>
                      <td className={`p-4 text-sm font-bold text-right whitespace-nowrap ${isRepayment ? 'text-blue-400' : isIncome ? 'text-secondary' : 'text-main'}`}>
                        <div className="flex items-center justify-end">
                          {isPositive ? <ArrowDownRight className={`w-3 h-3 mr-1 ${isRepayment ? 'text-blue-400' : ''}`} /> : <ArrowUpRight className="w-3 h-3 mr-1 text-danger" />}
                          {isPositive ? '+' : '-'}{currencySymbol}{parseFloat(tx.amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEdit(tx)} className="p-1.5 text-muted hover:text-primary rounded hover:bg-primary/10 transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-muted hover:text-danger rounded hover:bg-danger/10 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Duplicate"
                            onClick={() => duplicateTransaction(tx)}
                            className="p-1.5 text-muted hover:text-secondary rounded hover:bg-secondary/10 transition-all"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {!tx.is_recurring && (
                            <button
                              title="Convert to Recurring"
                              onClick={() => convertToRecurring(tx)}
                              className="p-1.5 text-muted hover:text-primary rounded hover:bg-primary/10 transition-all"
                            >
                              <Repeat2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            title="Copy Amount"
                            onClick={() => copyAmount(tx)}
                            className="p-1.5 text-muted hover:text-main rounded hover:bg-white/10 transition-all"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View Stacked Cards */}
            <div className="sm:hidden divide-y divide-white/5">
              {filteredTransactions.map(tx => {
                const isIncome = tx.type === 'income';
                const isRepayment = tx.type === 'repayment';
                const isPositive = isIncome || isRepayment;
                const cat = getCategoryDetails(tx.category_id);
                return (
                  <div key={tx.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: cat.color }} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-main truncate flex items-center gap-1.5">
                            {cat.name}
                            {tx.is_recurring && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-primary/10 text-primary text-[9px] font-semibold">
                                <RefreshCw className="w-2 h-2" />
                                Recur
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                            <span>{format(new Date(tx.timestamp), 'dd MMM yy')}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            <span className="truncate max-w-[120px]">{getSourceName(tx.source_id)}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`text-right font-bold text-sm shrink-0 whitespace-nowrap ${isRepayment ? 'text-blue-400' : isIncome ? 'text-secondary' : 'text-main'}`}>
                        <div className="flex items-center justify-end">
                          {isPositive ? <ArrowDownRight className={`w-3 h-3 mr-0.5 ${isRepayment ? 'text-blue-400' : ''}`} /> : <ArrowUpRight className="w-3 h-3 mr-0.5 text-danger" />}
                          {isPositive ? '+' : '-'}{currencySymbol}{parseFloat(tx.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {tx.notes && (
                      <div className="text-xs text-muted pl-5 italic truncate" title={tx.notes}>
                        "{tx.notes}"
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between border-t border-white/[0.02] pt-2">
                      <span className="text-[10px] text-muted font-mono">ID: #{tx.id.toString().slice(-4)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(tx)} className="p-1 hover:text-primary rounded hover:bg-primary/10 transition-all">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1 hover:text-danger rounded hover:bg-danger/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => duplicateTransaction(tx)} className="p-1 hover:text-secondary rounded hover:bg-secondary/10 transition-all">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => copyAmount(tx)} className="p-1 hover:text-main rounded hover:bg-white/10 transition-all">
                          <Clipboard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Transaction' : 'Add Transaction'}>
        {sources.length === 0 || categories.length === 0 ? (
          <div className="p-4 text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-500/20 animate-pulse">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-main">Let's Set Up Your Workspace</h3>
              <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
                To start tracking your transactions, you need to set up at least one financial account and transaction category first.
              </p>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a 
                href="/accounts"
                onClick={(e) => {
                  e.preventDefault();
                  setIsModalOpen(false);
                  window.location.href = '/accounts';
                }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-main block">Create Account</span>
                  <span className="text-[10px] text-muted">Add a bank or wallet</span>
                </div>
              </a>

              <a 
                href="/settings?tab=categories"
                onClick={(e) => {
                  e.preventDefault();
                  setIsModalOpen(false);
                  window.location.href = '/settings?tab=categories';
                }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-secondary/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-main block">Manage Categories</span>
                  <span className="text-[10px] text-muted">Create & edit custom categories</span>
                </div>
              </a>
            </div>

            {/* Quick Demo Option */}
            <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-main block">Want a quick preview?</span>
                <span className="text-[10px] text-muted block text-center mx-auto">Instantly populate your vault with realistic mock transactions, categories, and accounts.</span>
              </div>
              <button 
                onClick={handleSeedDemoData} 
                disabled={isSeedingDemo}
                className="w-full h-10 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSeedingDemo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Seeding Workspace...
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    Populate Demo Workspace
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-main hover:bg-white/5 transition-all cursor-pointer">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Type</label>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'expense', category_id: '' })} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${formData.type === 'expense' ? 'bg-danger/20 border-danger/50 text-danger' : 'border-white/10 text-muted hover:bg-white/5'}`}>Expense</button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'income', category_id: '' })} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${formData.type === 'income' ? 'bg-secondary/20 border-secondary/50 text-secondary' : 'border-white/10 text-muted hover:bg-white/5'}`}>Income</button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'repayment', category_id: '' })} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${formData.type === 'repayment' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-white/10 text-muted hover:bg-white/5'}`}>Repayment</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Amount</label>
                <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="input-field" placeholder="0.00" />
              </div>
            </div>

            {/* Quick Preset Ribbon */}
            {formData.type !== 'repayment' && (
              <div className="mt-2">
                <span className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wider text-left">Quick Presets</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {presets.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-main hover:bg-primary/10 hover:border-primary/30 transition-all shrink-0 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.type === 'repayment' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">Paid Using Which Account?</label>
                    <CustomSelect
                      required
                      value={formData.repayment_funding_id}
                      onChange={v => setFormData({ ...formData, repayment_funding_id: v })}
                      options={sources.filter(s => s.type !== 'credit_card').map(s => ({ value: s.id, label: s.name }))}
                      placeholder="Select Funding Account"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">Repaying Which Credit Card?</label>
                    <CustomSelect
                      required
                      value={formData.repayment_target_id}
                      onChange={v => setFormData({ ...formData, repayment_target_id: v })}
                      options={sources.filter(s => s.type === 'credit_card').map(s => ({ value: s.id, label: s.name }))}
                      placeholder="Select Credit Card"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Payment Type</label>
                  <CustomSelect
                    required
                    value={formData.repayment_type}
                    onChange={v => setFormData({ ...formData, repayment_type: v })}
                    options={[
                      { value: 'full', label: 'Full Bill Payment' },
                      { value: 'minimum', label: 'Minimum Due Payment' },
                      { value: 'emi', label: 'EMI Repayment' },
                      { value: 'partial', label: 'Partial Card Repayment' },
                    ]}
                    placeholder="Select Payment Type"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Account</label>
                  <CustomSelect
                    required
                    value={formData.source_id}
                    onChange={v => setFormData({ ...formData, source_id: v })}
                    options={sources.map(s => ({ value: s.id, label: s.name }))}
                    placeholder="Select Account"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
                  <CustomSelect
                    required
                    value={formData.category_id}
                    onChange={v => setFormData({ ...formData, category_id: v })}
                    options={[
                      { value: '', label: 'Select Category' },
                      ...filteredCategories.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    placeholder="Select Category"
                  />
                  {filteredCategories.find(c => c.id === formData.category_id)?.name === 'Others' && (
                    <input type="text" placeholder="Enter custom category" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="input-field mt-3" />
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-sm font-medium text-muted">Date</label>
                <div className="relative flex items-center group">
                  <button
                    type="button"
                    onMouseEnter={() => setShowDateTooltip(true)}
                    onMouseLeave={() => setShowDateTooltip(false)}
                    onClick={() => setShowDateTooltip(!showDateTooltip)}
                    className="p-0.5 rounded-full text-muted hover:text-amber-500 hover:bg-white/5 transition-all outline-none cursor-pointer"
                    aria-label="Ledger starting anchor info"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {showDateTooltip && (
                    <div className="absolute left-0 bottom-full mb-2 z-[999] w-64 p-3.5 rounded-xl glass-premium border border-amber-500/20 bg-slate-950/95 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-left animate-fade-in text-[11px] leading-relaxed">
                      <div className="flex gap-1.5 items-center mb-1.5 font-bold text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span>Tracking Anchor Rule</span>
                      </div>
                      <p className="text-muted">
                        Your chronological ledger starts strictly on your onboarding date: <strong className="text-main font-semibold">{onboardingDateStr}</strong>. Prior dates are greyed out to guarantee mathematical balance accuracy.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <PremiumDatePicker 
                value={formData.timestamp} 
                onChange={(val) => setFormData({ ...formData, timestamp: val })} 
                maxDate={new Date()} 
                minDate={onboardingDate || undefined}
              />
              
              {onboardingDateStr && (
                <div className="mt-2.5 p-2.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-start gap-2 shadow-[0_0_15px_rgba(245,158,11,0.03)]">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted leading-normal">
                    Dates prior to your onboarding date (<strong className="text-main font-medium">{onboardingDateStr}</strong>) are greyed out and disabled. Chronological entries are locked to maintain perfect ledger safety.
                    <Link 
                      to="/settings?tab=preferences"
                      onClick={() => setIsModalOpen(false)}
                      className="underline font-bold hover:text-amber-100 transition-colors ml-1"
                    >
                      Need to log prior transactions? Adjust your Ledger Start Date in Settings.
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {formData.timestamp && (
              <div className="relative">
                <label className="block text-sm font-medium text-muted mb-2">
                  Time {isToday(formData.timestamp) ? <span className="text-xs text-muted ml-1">(optional for today)</span> : <span className="text-xs text-danger ml-1">*required</span>}
                </label>
                <button
                  type="button"
                  onClick={handleToggleClock}
                  className="input-field h-12 flex items-center justify-between"
                >
                  <span>{manualTime || (isToday(formData.timestamp) ? 'Current time (auto)' : 'Select time')}</span>
                  <Clock className="w-4 h-4 text-muted" />
                </button>

                {showClock && (
                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[320px] sm:w-[360px] rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.7)] border border-black/5 dark:border-white/10 backdrop-blur-2xl p-4" style={{ backgroundColor: 'var(--surface)' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <div className="rounded-xl p-5 border border-black/5 dark:border-white/10" style={{ backgroundColor: 'var(--surface)' }}>
                        <div className="flex justify-center mb-5">
                          <div className="flex rounded-2xl p-1 border border-black/5 dark:border-white/10" style={{ backgroundColor: 'var(--surface-2)' }}>
                            {['AM', 'PM'].map(period => (
                              <button key={period} type="button"
                                onClick={() => { const cur = dayjs(`2026-01-01 ${manualTime}`); setManualTime(cur.format('hh:mm') + ` ${period}`); }}
                                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${manualTime.includes(period) ? 'bg-blue-500 text-white' : 'text-muted hover:bg-white/5'}`}
                              >{period}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <TimeClock ampm value={dayjs(`2026-01-01 ${manualTime}`)}
                            onChange={(v) => { if (v) setManualTime(dayjs(v).format('hh:mm A')); }}
                            sx={{
                              width: 260, height: 260,
                              '& .MuiClock-clock': { background: 'radial-gradient(circle at center, var(--surface-2) 0%, var(--surface) 100%)' },
                              '& .MuiClockNumber-root': { color: 'var(--text)', fontSize: '17px', fontWeight: 500 },
                              '& .Mui-selected': { backgroundColor: 'var(--primary) !important', color: '#fff !important' },
                              '& .MuiClock-pin': { backgroundColor: 'var(--primary)' },
                              '& .MuiClockPointer-root': { backgroundColor: 'var(--primary)' },
                              '& .MuiClockPointer-thumb': { backgroundColor: 'var(--primary)', border: '16px solid var(--primary)' },
                            }}
                          />
                        </div>
                        <div className="flex justify-end mt-5">
                          <button type="button" onClick={() => setShowClock(false)} className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">Done</button>
                        </div>
                      </div>
                    </LocalizationProvider>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Notes (Optional)</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field" placeholder="What was this for?" />
            </div>

            {/* Recurring */}
            <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-main">Recurring Transaction</p>
                  <p className="text-xs text-muted">Mark as a repeating scheduled payment</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, is_recurring: !f.is_recurring, recurring_interval: !f.is_recurring ? 'monthly' : '' }))}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                  style={{ backgroundColor: formData.is_recurring ? 'var(--primary)' : 'rgba(148,163,184,0.3)' }}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_recurring ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {formData.is_recurring && (
                <CustomSelect
                  value={formData.recurring_interval}
                  onChange={v => setFormData(f => ({ ...f, recurring_interval: v }))}
                  className="mt-2"
                  options={[
                    { value: 'weekly',  label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly',  label: 'Yearly' },
                    { value: 'custom',  label: 'Custom' },
                  ]}
                />
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Transaction">
        <div className="space-y-6">
          <p className="text-muted leading-relaxed">Are you sure? This will revert the account balance.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={confirmDelete} className="btn-danger">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Financial Integrity Guard Modal */}
      <Modal 
        isOpen={!!safetyAlert} 
        onClose={() => setSafetyAlert(null)} 
        title="Financial Integrity Shield"
      >
        {safetyAlert && (
          <div className="space-y-6">
            {/* Header / Alert Icon */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20 animate-pulse">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-main">
                {safetyAlert.category === 'Insufficient funds' ? 'Insufficient Funds' : 
                 safetyAlert.category === 'Limit exceeded' ? 'Credit Limit Exceeded' :
                 safetyAlert.category === 'Shared pool limit exceeded' ? 'Shared Pool Limit Exceeded' : 'Spending Limit Exceeded'}
              </h3>
              <p className="text-xs text-muted max-w-sm">
                This transaction has been blocked to prevent your account from going into a negative balance or exceeding its credit limit.
              </p>
            </div>

            {/* Structured Card Details */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {safetyAlert.category}
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-muted font-mono">
                  {safetyAlert.date}
                </span>
              </div>
              
              <div className="p-4 grid grid-cols-2 gap-4 divide-x divide-white/5">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Available Balance</span>
                  <span className="text-lg font-bold text-main font-mono">₹{safetyAlert.availableAmount}</span>
                </div>
                <div className="pl-4 space-y-1">
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Attempted Spend</span>
                  <span className="text-lg font-bold text-red-400 font-mono">₹{safetyAlert.attemptedAmount}</span>
                </div>
              </div>
            </div>

            {/* Explanation & Timeline Visualizer Toggle */}
            <div className="space-y-3">
              <div className="text-xs text-muted leading-relaxed bg-white/[0.01] p-4 rounded-lg border border-white/5 space-y-2">
                <strong className="font-bold text-red-400 block mb-1">What went wrong?</strong>
                {safetyAlert.category === 'Insufficient funds' && (
                  <span>
                    You are trying to record a <strong>₹{safetyAlert.attemptedAmount}</strong> expense on <strong>{safetyAlert.date}</strong>, but your available balance on that date is only <strong>₹{safetyAlert.availableAmount}</strong>. Saving this would cause your account to drop below zero.
                  </span>
                )}
                {safetyAlert.category === 'Limit exceeded' && (
                  <span>
                    You are trying to charge <strong>₹{safetyAlert.attemptedAmount}</strong> on <strong>{safetyAlert.date}</strong>, but your available credit limit is only <strong>₹{safetyAlert.availableAmount}</strong>. Saving this would exceed your card's outstanding credit limit.
                  </span>
                )}
                {safetyAlert.category === 'Shared pool limit exceeded' && (
                  <span>
                    You are trying to spend <strong>₹{safetyAlert.attemptedAmount}</strong> on <strong>{safetyAlert.date}</strong>, but the shared pool's available credit limit is only <strong>₹{safetyAlert.availableAmount}</strong>. Saving this would exceed the group pool limit.
                  </span>
                )}
                {safetyAlert.category === 'Spending power exceeded' && (
                  <span>
                    Your actual spendable credit on <strong>{safetyAlert.date}</strong> is only <strong>₹{safetyAlert.availableAmount}</strong> due to combined card and pool constraints, which is not enough for this <strong>₹{safetyAlert.attemptedAmount}</strong> transaction.
                  </span>
                )}
              </div>
              
              {/* Interactive Timeline Detail */}
              <div className="border border-white/5 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTimelineDetails(!showTimelineDetails)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold text-main transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Interactive Ledger Analysis
                  </span>
                  <span className="text-[10px] text-muted font-normal underline">
                    {showTimelineDetails ? 'Hide Timeline Flow' : 'Show Timeline Flow'}
                  </span>
                </button>

                {showTimelineDetails && (
                  <div className="p-4 bg-black/20 border-t border-white/5 text-xs text-muted space-y-4 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-main block">1. Prior Ledger Balance</span>
                        <span>Your confirmed available funds before the transaction was ₹{safetyAlert.availableAmount}.</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-main block">2. Incompatible Action</span>
                        <span>Attempting to deduct ₹{safetyAlert.attemptedAmount} exceeds your limits by <strong className="text-red-400 font-mono">₹{parseFloat((parseFloat(safetyAlert.attemptedAmount.replace(/,/g, '')) - parseFloat(safetyAlert.availableAmount.replace(/,/g, ''))).toFixed(2))}</strong>.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-main block">3. Suggested Resolution</span>
                        <span>Reduce the transaction amount below <strong className="text-emerald-400 font-mono">₹{safetyAlert.availableAmount}</strong>, charge a different account, or log this transaction on a date with higher liquidity.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/5 flex gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setSafetyAlert(null);
                  setIsModalOpen(false);
                }} 
                className="btn-secondary flex-1"
              >
                Cancel Transaction
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setSafetyAlert(null);
                }} 
                className="btn-primary flex-1"
              >
                Adjust Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

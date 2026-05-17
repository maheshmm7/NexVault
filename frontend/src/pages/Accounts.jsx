import { useState, useEffect, useMemo } from 'react';
import { Plus, Wallet, Building2, CreditCard, Landmark, Trash2, Edit, ArrowDownRight, Clock } from 'lucide-react';
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


export default function Accounts() {

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    balance: '0',

    // Credit Card Fields
    credit_limit: '',
    available_limit: '',
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
  const { addToast } = useToast();
  const { currencySymbol } = useSettings();

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
        sum +
        (
          Number(acc.credit_limit || 0) -
          Number(acc.available_limit || 0)
        ),
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
        
      // Last Activity Date
      const lastTx = sourceTx.length > 0 
        ? sourceTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null;
        
      stats[acc.id] = {
        monthlySpend,
        lastActivity: lastTx ? dayjs(lastTx.timestamp).fromNow() : 'No activity'
      };
    });
    return stats;
  }, [accounts, transactions]);

  const fetchAccounts = async () => {
    try {
      const [sourcesRes, txRes] = await Promise.all([
        api.get('/sources'),
        api.get('/transactions')
      ]);
      setAccounts(sourcesRes.data);
      setTransactions(txRes.data);
    } catch (err) {
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
      balance: formData.balance === '' ? 0 : Number(formData.balance),
      credit_limit: formData.credit_limit === '' ? null : Number(formData.credit_limit),
      available_limit: formData.available_limit === '' ? null : Number(formData.available_limit),
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
      available_limit: account.available_limit || '',

      // Shared
      account_number_last4:
        account.account_number_last4 || '',
      network: account.network || '',
      billing_date: account.billing_date || '',
      due_date: account.due_date || '',

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

    setEditingId(account.id);

    setIsModalOpen(true);
  };

  const openAdd = () => {
    setFormData({
      name: '',
      type: 'bank',
      balance: '0',

      // Credit Card
      credit_limit: '',
      available_limit: '',

      // Shared
      account_number_last4: '',
      network: '',
      billing_date: '',
      due_date: '',

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

    setIsModalOpen(true);
  };

  const handleDelete = async () => {

    if (!deleteTarget) return;

    try {

      await api.delete(`/sources/${deleteTarget.id}`);

      addToast('Account deleted', 'success');

      setDeleteTarget(null);

      fetchAccounts();

    } catch (err) {

      addToast(
        'Cannot delete account with linked transactions',
        'error'
      );

    }

  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-main tracking-tight">Accounts</h1>
          <p className="text-muted mt-1">Manage your banks, cards, and wallets.</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </button>
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


      {loading ? (
        <LoadingScreen variant="compact" message="Auditing account balances..." />
      ) : accounts.length === 0 ? (

        <EmptyState 
          variant="dashed"
          icon={Building2}
          title="No Accounts Yet"
          description="Add your bank accounts, credit cards, or wallets to start tracking your finances across all your sources."
          actionText="Add Your First Account"
          onAction={openAdd}
        />
      ) : (




        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const config = typeConfig[acc.type] || typeConfig.bank;
            const Icon = config.icon;
            return (
              <div key={acc.id} className={`card
              p-5
              transition-all
              group
              flex
              flex-col
              ${acc.type === 'credit_card'
                  ? 'min-h-[260px]'
                  : 'min-h-[210px]'
                }
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
                      <div className="min-w-0">

                        <h3
                          className="text-lg font-semibold text-main leading-snug"
                          title={acc.name}
                        >
                          {acc.name}
                        </h3>

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

                  </div>


                  {acc.type === 'credit_card' ? (
                    <div className="space-y-3 flex-1 flex flex-col relative overflow-hidden">
                      {/* Decorative Background Icon for Credit Card */}
                      <Icon className="absolute -bottom-8 -right-8 w-32 h-32 text-main opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />

                      {/* Card Number */}
                      <div className="text-sm text-muted tracking-widest">
                        XXXX XXXX XXXX {acc.account_number_last4 || '0000'}
                      </div>

                      {/* Available */}
                      <div>
                        <div className="text-xs text-muted mb-1">
                          Available Limit
                        </div>

                        <div className="text-2xl font-bold tracking-tight text-main">
                          {currencySymbol}
                          {Number(acc.available_limit || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Progress */}
                      <div>

                        {/* Used Amount */}
                        <div className="flex justify-between text-xs text-muted mb-1">

                          <span>Used</span>

                          <span>
                            {currencySymbol}

                            {(
                              Number(acc.credit_limit || 0) -
                              Number(acc.available_limit || 0)
                            ).toFixed(2)}

                            {' / '}

                            {currencySymbol}

                            {Number(acc.credit_limit || 0)}
                          </span>

                        </div>

                        {/* Utilization + Due */}
                        <div className="flex justify-between items-center mt-2 mb-2">

                          {/* Utilization */}
                          <div
                            className={`text-xs font-medium ${(
                              (
                                Number(acc.credit_limit || 0) -
                                Number(acc.available_limit || 0)
                              ) /
                              Number(acc.credit_limit || 1)
                            ) < 0.3
                              ? 'text-emerald-400'
                              : (
                                (
                                  Number(acc.credit_limit || 0) -
                                  Number(acc.available_limit || 0)
                                ) /
                                Number(acc.credit_limit || 1)
                              ) < 0.7
                                ? 'text-blue-400'
                                : 'text-red-400'
                              }`}
                          >

                            {(
                              (
                                (
                                  Number(acc.credit_limit || 0) -
                                  Number(acc.available_limit || 0)
                                ) /
                                Number(acc.credit_limit || 1)
                              ) * 100
                            ).toFixed(0)}% Utilized

                          </div>

                          {/* Smart Billing + Due Dates */}
                          {acc.billing_date && acc.due_date && (() => {

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const billingBase = new Date(acc.billing_date);
                            const dueBase = new Date(acc.due_date);
                            const billingDay = billingBase.getDate();
                            const dueDay = dueBase.getDate();

                            const getSafeMonthlyDate = (year, month, targetDay) => {
                              const lastDayInMonth = new Date(year, month + 1, 0).getDate();
                              return new Date(year, month, Math.min(targetDay, lastDayInMonth));
                            };

                            let billingYear = today.getFullYear();
                            let billingMonth = today.getMonth();
                            let nextBilling = getSafeMonthlyDate(billingYear, billingMonth, billingDay);

                            if (nextBilling < today) {
                              billingMonth += 1;
                              nextBilling = getSafeMonthlyDate(billingYear, billingMonth, billingDay);
                            }

                            let dueYear = nextBilling.getFullYear();
                            let dueMonth = nextBilling.getMonth();

                            if (dueDay < billingDay) {
                              dueMonth += 1;
                            }

                            const nextDue = getSafeMonthlyDate(dueYear, dueMonth, dueDay);
                            nextDue.setHours(0, 0, 0, 0);

                            const diffTime = nextDue.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            let dueColor = 'text-muted';

                            if (diffDays <= 5) {
                              dueColor = 'text-yellow-400';
                            }

                            if (diffDays <= 1) {
                              dueColor = 'text-red-400';
                            }

                            if (diffDays < 0) {
                              dueColor = 'text-red-500';
                            }

                            return (

                              <div className="flex items-center gap-4 flex-wrap justify-end">

                                {/* Next Bill */}
                                <div className="text-[11px] text-muted">

                                  Bill:
                                  {' '}

                                  {nextBilling.toLocaleDateString(
                                    'en-IN',
                                    {
                                      day: '2-digit',
                                      month: 'short'
                                    }
                                  )}

                                </div>

                                {/* Next Due */}
                                <div className="text-[11px] text-muted">

                                  Due:
                                  {' '}

                                  {nextDue.toLocaleDateString(
                                    'en-IN',
                                    {
                                      day: '2-digit',
                                      month: 'short'
                                    }
                                  )}

                                </div>

                                {/* Due Countdown */}
                                <div className={`text-[11px] font-medium ${dueColor}`}>

                                  {diffDays < 0
                                    ? 'Overdue'
                                    : `in ${diffDays}d`
                                  }

                                </div>

                              </div>

                            );

                          })()}



                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">

                          <div
                            className={`
                            h-full
                            rounded-full
                            transition-all
                            duration-500

                            ${(() => {

                                const usedPercentage =
                                  (
                                    (
                                      Number(acc.credit_limit || 0) -
                                      Number(acc.available_limit || 0)
                                    ) /
                                    Number(acc.credit_limit || 1)
                                  ) * 100;

                                if (usedPercentage >= 70) {
                                  return 'bg-red-500 dark:bg-red-400';
                                }

                                if (usedPercentage >= 30) {
                                  return 'bg-blue-500 dark:bg-blue-400';
                                }

                                return 'bg-green-500 dark:bg-green-400';

                              })()}
                            `}
                            style={{
                              width: `${(
                                (
                                  Number(acc.credit_limit || 0) -
                                  Number(acc.available_limit || 0)
                                ) /
                                Number(acc.credit_limit || 1)
                              ) * 100}%`
                            }}
                          />

                        </div>

                        {/* Smart Alerts */}
                        <div className="flex flex-wrap gap-2 mt-3">

                          {/* Due Soon */}
                          {(() => {

                            const today = new Date();

                            const dueDate = new Date(acc.due_date);

                            const diffDays = Math.ceil(
                              (
                                dueDate.getTime() -
                                today.getTime()
                              ) / (1000 * 60 * 60 * 24)
                            );

                            if (diffDays < 0) {

                              return (
                                <div className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold">
                                  Payment Overdue
                                </div>
                              );

                            }

                            if (diffDays <= 3) {

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
                                (
                                  Number(acc.credit_limit || 0) -
                                  Number(acc.available_limit || 0)
                                ) /
                                Number(acc.credit_limit || 1)
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

                            const availablePercentage =
                              (
                                Number(acc.available_limit || 0) /
                                Number(acc.credit_limit || 1)
                              ) * 100;

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
                    <div className="space-y-4 flex-1 flex flex-col relative overflow-hidden">
                      {/* Decorative Background Icon for simple cards */}
                      <Icon className="absolute -bottom-8 -right-8 w-32 h-32 text-main opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />

                      <div className="flex-1 space-y-3 relative z-10">
                        {/* BANK ACCOUNT */}
                        {acc.type === 'bank' && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted">{acc.bank_name || 'Bank Account'}</div>
                            <div className="text-sm text-muted tracking-widest">XXXX {acc.account_number_last4 || '0000'}</div>
                            <div className="text-[11px] text-muted capitalize bg-white/5 px-2 py-0.5 rounded-md inline-block">
                              {acc.account_subtype || 'Savings'} Account
                            </div>
                          </div>
                        )}

                        {/* WALLET */}
                        {acc.type === 'wallet' && (
                          <div className="space-y-1.5">
                            <div className="text-sm text-muted font-mono bg-white/5 px-2 py-1 rounded-lg inline-block">{acc.upi_id || 'No UPI ID'}</div>
                            <div className="text-xs text-muted flex items-center gap-1.5">
                              <Landmark className="w-3 h-3 opacity-50" /> Linked: {acc.linked_bank_name || 'Bank'}
                            </div>
                          </div>
                        )}

                        {/* CASH */}
                        {acc.type === 'cash' && (
                          <div className="space-y-2">
                            <div className="text-sm text-muted">Physical Assets</div>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] text-muted px-2 py-0.5 rounded-md bg-white/5 border border-white/5 uppercase tracking-tighter">Liquid</span>
                              <span className="text-[10px] text-muted px-2 py-0.5 rounded-md bg-white/5 border border-white/5 uppercase tracking-tighter">Manual</span>
                            </div>
                          </div>
                        )}

                        {/* DEBIT CARD */}
                        {acc.type === 'debit_card' && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted">{acc.bank_name || 'Linked Bank'}</div>
                            <div className="text-sm text-muted tracking-widest">XXXX {acc.account_number_last4 || '0000'}</div>
                          </div>
                        )}
                      </div>

                      {/* BALANCE */}
                      <div className="relative z-10 pt-2 border-t border-white/5 mt-auto">
                        <div className="text-xs text-muted mb-1 opacity-60">Current Balance</div>
                        <div className="text-2xl font-bold tracking-tight text-main">
                          {currencySymbol}{Number(acc.balance || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* STATS FOOTER (The "Potential" realized) */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03] relative z-10">
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

              {/* Billing Date */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Billing Date
                </label>

                <PremiumDatePicker
                  value={formData.billing_date}
                  onChange={(val) => setFormData({ ...formData, billing_date: val })}
                />
              </div>
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Due Date
                </label>

                <PremiumDatePicker
                  value={formData.due_date}
                  onChange={(val) => setFormData({ ...formData, due_date: val })}
                />
              </div>

              {/* Total Limit */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Total Credit Limit
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
                  placeholder="100000"
                  required
                />
              </div>



              {/* Available Limit */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Available Limit (Optional)
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={formData.available_limit}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      available_limit: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="65000"
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
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNotificationCenter } from '../contexts/NotificationCenterContext';
import dayjs from 'dayjs';
import { LogOut, Plus, Menu, Bell, Tag, TrendingUp, Calendar, DollarSign, Info, X, CheckCheck, Trash2, ChevronRight, Landmark, CreditCard, Wallet } from 'lucide-react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BRANDING } from '../config/branding';


// Maps notification types to icons and accent colors
const NOTIF_META = {
  coupon_expiry:    { Icon: Tag,         color: 'var(--primary)' },
  bill_reminder:    { Icon: DollarSign,  color: '#f59e0b' },
  credit_alert:     { Icon: TrendingUp,  color: '#ef4444' },
  monthly_summary:  { Icon: Calendar,    color: '#10b981' },
  info:             { Icon: Info,        color: 'var(--primary)' },
};

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { currencySymbol } = useSettings();
  const { notifications: inbox, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationCenter();

  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning';
    if (hr >= 12 && hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const routeMeta = useMemo(() => {
    const routeMap = {
      '/': {
        title: 'Overview',
        subtitle: 'Real-time asset health and net position check'
      },
      '/dashboard': {
        title: 'Overview',
        subtitle: 'Real-time asset health and net position check'
      },
      '/transactions': {
        title: 'Transactions',
        subtitle: 'View, search, and manage chronological ledger entries'
      },
      '/accounts': {
        title: 'Accounts',
        subtitle: 'Manage linked bank accounts, digital wallets, and cards'
      },
      '/credit-pools': {
        title: 'Credit Pools',
        subtitle: 'Monitor shared credit utilization and billing cycle thresholds'
      },
      '/vault': {
        title: 'Coupon Vault',
        subtitle: 'Track active discounts, copy coupon codes, and monitor expiries'
      },
      '/settings': {
        title: 'Settings',
        subtitle: 'Configure user profile, week start, and ledger anchor dates'
      },
      '/analytics': {
        title: 'Analytics',
        subtitle: 'Visualize 30-day cash flow trends and category distributions'
      }
    };
    return routeMap[pathname] || { title: 'Overview', subtitle: 'Secure Financial Portal' };
  }, [pathname, greeting, user]);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for actions dispatched from the Command Palette
  useEffect(() => {
    const handler = (e) => {
      if (e.detail === 'add-transaction') setIsModalOpen(true);
    };
    window.addEventListener(BRANDING.ACTION_EVENT, handler);
    return () => window.removeEventListener(BRANDING.ACTION_EVENT, handler);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    source_id: '',
    category_id: '',
    amount: '',
    type: 'expense',
    notes: '',
  });

  useEffect(() => {
    if (isModalOpen) {
      fetchDropdownData();
    }
  }, [isModalOpen]);


  const fetchDropdownData = async () => {
    try {
      const [sourcesRes, categoriesRes] = await Promise.all([
        api.get('/sources/'),
        api.get('/categories/'),
      ]);
      setSources(sourcesRes.data);
      setCategories(categoriesRes.data);
    } catch {
      // silent — not critical
    }
  };

  // Filter categories by the selected transaction type
  const filteredCategories = useMemo(
    () => categories.filter(c => c.type === formData.type),
    [categories, formData.type]
  );

  const handleTypeChange = (type) => {
    setFormData(f => ({ ...f, type, category_id: '' }));
  };

  const evaluatedValue = useMemo(() => {
    const val = formData.amount;
    if (!val) return null;
    
    // Check if it contains actual math characters
    const hasMath = /[\+\-\*\/]/.test(val);
    if (!hasMath) return null;
    
    // Sanitize to only permit numbers, basic operators, and decimal points
    const sanitized = val.replace(/[^0-9+\-*\/() .]/g, '');
    try {
      // Evaluate basic arithmetic expression safely
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Number(result.toFixed(2));
      }
    } catch {
      // fail silently
    }
    return 'Invalid expression';
  }, [formData.amount]);

  const handleNotifAction = (e, notif) => {
    e.stopPropagation();
    markAsRead(notif.id);
    setBellOpen(false);
    
    if (notif.type === 'bill_reminder') {
      const amtMatch = notif.message.match(/(?:₹|\$|RS\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i);
      const parsedAmt = amtMatch ? amtMatch[1].replace(/,/g, '') : '';
      
      setFormData({
        source_id: sources[0]?.id || '',
        category_id: '',
        amount: parsedAmt,
        type: 'expense',
        notes: `Bill Pay: ${notif.title}`,
      });
      setIsModalOpen(true);
    } else if (notif.type === 'coupon_expiry') {
      navigate('/vault');
    } else if (notif.type === 'credit_alert' || (notif.type === 'warning' && notif.title.toLowerCase().includes('credit'))) {
      navigate('/credit-pools');
    } else if (notif.type === 'monthly_summary') {
      navigate('/analytics');
    } else if (notif.type === 'warning' && notif.title.toLowerCase().includes('balance')) {
      navigate('/accounts');
    } else {
      navigate('/accounts');
    }
  };

  const handleSaveTransaction = async () => {
    let finalAmount = formData.amount;
    if (evaluatedValue) {
      if (evaluatedValue === 'Invalid expression') {
        addToast('Please enter a valid mathematical expression or a number', 'error');
        return;
      }
      finalAmount = evaluatedValue;
    }

    if (!formData.source_id || !formData.category_id || !finalAmount) {
      addToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalCategoryId = formData.category_id;

      const selectedCategory = categories.find(c => c.id === formData.category_id);
      if (selectedCategory?.name === 'Others' && customCategory.trim()) {
        const res = await api.post('/categories/', {
          name: customCategory,
          type: formData.type,
          color: '#6B7280',
          icon: 'circle',
        });
        finalCategoryId = res.data.id;
      }

      await api.post('/transactions/', {
        source_id: formData.source_id,
        category_id: finalCategoryId,
        amount: parseFloat(finalAmount),
        type: formData.type,
        notes: formData.notes,
        timestamp: new Date().toISOString(),
        is_recurring: false,
      });

      addToast('Transaction added successfully', 'success');
      setCustomCategory('');
      setFormData({ source_id: '', category_id: '', amount: '', type: 'expense', notes: '' });
      setIsModalOpen(false);

      // Notify pages to refresh
      setTimeout(() => window.dispatchEvent(new Event('transactionAdded')), 100);
    } catch (error) {
      addToast(error.response?.data?.detail || 'Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header
        className="h-16 border-b border-white/5 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-muted hover:text-main transition-colors p-1.5 rounded-lg hover:bg-white/5"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-base font-black text-main tracking-tight md:hidden select-none">{routeMeta.title}</span>

          {/* Dynamic Page Heading & Context Subtitle */}
          <div className="hidden md:flex flex-col min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-main tracking-tight animate-fade-in select-none">
              {routeMeta.title}
            </h1>
            <span className="text-[11px] text-muted font-medium mt-0.5 hidden sm:inline-block leading-tight select-none">
              {routeMeta.subtitle}
            </span>
          </div>
        </div>

        {/* Right — grouped action bar */}
        <div className="flex items-center gap-2">
          {/* Quick Transaction */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:flex items-center gap-2 btn-primary text-sm py-2 px-4"
          >
            <Plus className="w-4 h-4" />
            Quick Transaction
          </button>

          {/* Ctrl+K hint */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted border transition-colors hover:text-main hover:border-white/20"
            style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}
            title="Open Command Palette"
          >
            <span>⌘K</span>
          </button>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-px mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Bell Notification Icon */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => { setBellOpen(o => !o); }}
              className="relative p-2 text-muted hover:text-main hover:bg-white/5 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel / Responsive Mobile Bottom Sheet */}
            {bellOpen && (
              <>
                {/* Backdrop visible on mobile screen only */}
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm sm:hidden z-40"
                  onClick={() => setBellOpen(false)}
                />
                <div
                  className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-3 w-full sm:w-[340px] rounded-t-2xl sm:rounded-2xl shadow-[var(--shadow-xl)] border overflow-hidden z-50 flex flex-col max-h-[80vh] sm:max-h-[520px]"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      <span className="text-sm font-semibold text-main">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#ef4444' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {inbox.length > 0 && (
                        <>
                          <button
                            onClick={markAllAsRead}
                            className="p-1.5 rounded-lg transition-colors text-muted hover:text-main hover:bg-white/5"
                            title="Mark all as read"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={clearAll}
                            className="p-1.5 rounded-lg transition-colors text-muted hover:text-danger hover:bg-danger/10"
                            title="Clear all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setBellOpen(false)}
                        className="p-1.5 rounded-lg transition-colors text-muted hover:text-main hover:bg-white/5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto flex-1">
                    {inbox.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted">
                        <Bell className="w-8 h-8 opacity-20" />
                        <p className="text-xs">No notifications yet</p>
                      </div>
                    ) : (
                      inbox.map(notif => {
                        let meta = NOTIF_META[notif.type] || NOTIF_META.info;
                        if (notif.type === 'warning') {
                          if (notif.title.toLowerCase().includes('credit')) {
                            meta = NOTIF_META.credit_alert;
                          } else if (notif.title.toLowerCase().includes('balance')) {
                            meta = { Icon: Info, color: '#f59e0b' };
                          }
                        }
                        const { Icon } = meta;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className="flex gap-3 px-4 py-3 border-b cursor-pointer transition-all hover:bg-white/[0.03] relative border-l-2"
                            style={{
                              borderColor: 'rgba(255,255,255,0.04)',
                              borderLeftColor: meta.color,
                              background: notif.isRead ? 'transparent' : 'rgba(var(--primary-rgb,99,102,241),0.03)',
                            }}
                          >
                            {/* Icon bubble */}
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${meta.color}18` }}
                            >
                              <Icon className="w-4 h-4" style={{ color: meta.color }} />
                            </div>

                            {/* Content */}
                            <div className="flex-grow min-w-0 flex flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-main leading-snug">{notif.title}</p>
                                {!notif.isRead && (
                                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                                )}
                              </div>
                              <p className="text-[11px] text-muted mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                              
                              {/* Context-aware CTA button */}
                              {notif.type && notif.type !== 'info' && !notif.isRead && (
                                <button
                                  onClick={(e) => handleNotifAction(e, notif)}
                                  className="mt-2 text-[10px] font-bold text-primary hover:text-white px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary transition-all border border-primary/20 self-start shrink-0 flex items-center gap-1 group/btn"
                                >
                                  {notif.type === 'bill_reminder' ? 'Pay Bill' : 
                                   notif.type === 'coupon_expiry' ? 'Use Coupon' : 
                                   (notif.type === 'credit_alert' || (notif.type === 'warning' && notif.title.toLowerCase().includes('credit'))) ? 'Manage Pool' : 
                                   'View Details'}
                                  <ChevronRight className="w-2.5 h-2.5 transition-transform group-hover/btn:translate-x-0.5" />
                                </button>
                              )}
                              
                              <p className="text-[10px] text-muted/60 mt-1">{formatRelativeTime(notif.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Quick Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Quick Transaction"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Records with the current date and time. Use the Transactions page for custom dates.
          </p>

          {/* Type toggle */}
          <div className="flex gap-2">
            {['expense', 'income'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  formData.type === t
                    ? t === 'expense'
                      ? 'bg-danger/15 border-danger/40 text-danger'
                      : 'bg-secondary/15 border-secondary/40 text-secondary'
                    : 'border-white/10 text-muted hover:bg-white/5'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Amount</label>
            <input
              type="text"
              placeholder="0.00 or e.g. 100 + 45"
              className="input-field font-mono"
              value={formData.amount}
              onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
            />
            {evaluatedValue && evaluatedValue !== 'Invalid expression' && (
              <span className="text-[11px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Evaluates to {currencySymbol}{evaluatedValue}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5 font-semibold">Account</label>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 select-none">
              {sources.map(s => {
                const isSelected = formData.source_id === s.id;
                let Icon = Landmark;
                let cardColor = 'from-blue-600/20 to-cyan-600/20 border-blue-500/30';
                if (s.type === 'credit_card') {
                  Icon = CreditCard;
                  cardColor = 'from-purple-600/20 to-pink-600/20 border-purple-500/30';
                } else if (s.type === 'wallet' || s.type === 'pocket_cash') {
                  Icon = Wallet;
                  cardColor = 'from-emerald-500/20 to-teal-600/20 border-emerald-500/30';
                }
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, source_id: s.id }))}
                    className={`flex flex-col items-start p-3 rounded-xl min-w-[120px] border transition-all text-left bg-gradient-to-br cursor-pointer shrink-0 relative overflow-hidden group ${
                      isSelected
                        ? `${cardColor} ring-2 ring-primary scale-[1.02] shadow-[0_4px_15px_rgba(59,130,246,0.15)]`
                        : 'border-white/5 bg-slate-900/40 text-muted hover:bg-slate-900/60 hover:text-main'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 transition-transform group-hover:scale-110 ${isSelected ? 'text-white' : 'text-muted'}`} />
                    <span className="text-xs font-bold truncate w-full leading-tight text-main">{s.name}</span>
                    <span className="text-[10px] opacity-75 mt-0.5 font-medium">{currencySymbol}{s.balance?.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
            {sources.length === 0 && (
              <p className="text-xs text-muted/70 italic">No accounts linked yet</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
            <CustomSelect
              value={formData.category_id}
              onChange={v => setFormData(f => ({ ...f, category_id: v }))}
              placeholder="Select Category"
              options={[
                { value: '', label: 'Select Category' },
                ...filteredCategories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          {categories.find(c => c.id === formData.category_id)?.name === 'Others' && (
            <input
              type="text"
              placeholder="Enter custom category name"
              className="input-field"
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              placeholder="What was this for?"
              className="input-field"
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <button
            onClick={handleSaveTransaction}
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Saving…' : 'Save Transaction'}
          </button>
        </div>
      </Modal>
    </>
  );
}
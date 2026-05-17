import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNotificationCenter } from '../contexts/NotificationCenterContext';
import dayjs from 'dayjs';
import { LogOut, Plus, Menu, Bell, Tag, TrendingUp, Calendar, DollarSign, Info, X, CheckCheck, Trash2, ChevronRight } from 'lucide-react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { useLocation } from 'react-router-dom';
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
  const pathname = location.pathname;

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const currentLabel = useMemo(() => {
    const routeMap = {
      '/': 'Dashboard',
      '/transactions': 'Transactions',
      '/accounts': 'Accounts',
      '/vault': 'Coupon Vault',
      '/settings': 'Settings',
      '/analytics': 'Analytics'
    };
    return routeMap[pathname] || 'Dashboard';
  }, [pathname]);

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

  const handleSaveTransaction = async () => {
    if (!formData.source_id || !formData.category_id || !formData.amount) {
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
        amount: parseFloat(formData.amount),
        type: formData.type,
        notes: formData.notes,
        timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
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
          <span className="text-base font-semibold text-main md:hidden">{BRANDING.NAME}</span>

          {/* Breadcrumbs & Dynamic Greeting */}
          <div className="hidden md:flex items-center gap-2 text-[10px] uppercase font-bold text-muted/60 tracking-[0.05em]">
            <span className="opacity-40">{BRANDING.NAME}</span>
            <ChevronRight className="w-3 h-3 opacity-20" />
            <span className="text-primary font-bold">{currentLabel}</span>

            {pathname === '/' && (
              <>
                <span className="h-4 w-px bg-white/10 mx-2" />
                <span className="text-muted/50 font-medium lowercase italic tracking-normal normal-case">
                  {greeting}, <span className="text-main font-bold">{user?.display_name || user?.full_name || 'Guest'}</span>
                </span>
              </>
            )}
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

            {/* Notification Dropdown Panel */}
            {bellOpen && (
              <div
                className="absolute right-0 top-full mt-3 w-[340px] rounded-2xl shadow-[var(--shadow-xl)] border overflow-hidden z-50 animate-fade-in-down"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  maxHeight: '520px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <span className="text-sm font-semibold text-main">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#ef4444' }}>
                        {unreadCount} new
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
                      const meta = NOTIF_META[notif.type] || NOTIF_META.info;
                      const { Icon } = meta;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className="flex gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-white/[0.03]"
                          style={{
                            borderColor: 'rgba(255,255,255,0.04)',
                            background: notif.isRead ? 'transparent' : 'rgba(var(--primary-rgb,99,102,241),0.04)',
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-main leading-snug">{notif.title}</p>
                              {!notif.isRead && (
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                              )}
                            </div>
                            <p className="text-[11px] text-muted mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-muted/60 mt-1">{formatRelativeTime(notif.timestamp)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="input-field"
              value={formData.amount}
              onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Account</label>
            <CustomSelect
              value={formData.source_id}
              onChange={v => setFormData(f => ({ ...f, source_id: v }))}
              placeholder="Select Account"
              options={[
                { value: '', label: 'Select Account' },
                ...sources.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
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
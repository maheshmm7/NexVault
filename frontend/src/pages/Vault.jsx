import { useState, useEffect, useMemo } from 'react';
import { Plus, Tag, Copy, Eye, EyeOff, Trash2, AlertCircle, Check, Calendar, Ticket, Hourglass } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { SkeletonCard, SkeletonVault } from '../components/Skeleton';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { format, isBefore, addDays } from 'date-fns';
import PremiumDatePicker from '../components/PremiumDatePicker';
import { BRANDING } from '../config/branding';
import LoadingScreen from '../components/LoadingScreen';
import ErrorState from '../components/ErrorState';

// Inject custom CSS keyframe animations for the confetti explosion at the document head
if (typeof document !== 'undefined') {
  const styleId = 'confetti-animation-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes confetti-burst {
        0% {
          transform: translate(-50%, -50%) scale(1) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.1) rotate(var(--rot));
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

const STATUS_COLORS = {
  active:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: '#10b981' },
  used:    { bg: 'bg-slate-500/10',   text: 'text-slate-400',   dot: '#64748b' },
  expired: { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: '#ef4444' },
};

const EMPTY_FORM = { title: '', code: '', pin: '', category: '', expiry_date: '', description: '', status: 'active' };

export default function Vault() {
  const { couponPreferences, dateTimePreferences } = useSettings();
  const dFormat = dateTimePreferences?.dateFormat || 'dd/MM/yyyy';
  const [coupons, setCoupons]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [showPin, setShowPin]         = useState({});
  const [filter, setFilter]           = useState('active');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData]       = useState({ ...EMPTY_FORM });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { addToast } = useToast();

  const triggerConfetti = (button) => {
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

    for (let i = 0; i < 35; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 7 + 4; // 4px to 11px

      particle.style.position = 'fixed';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      particle.style.zIndex = '999999';
      particle.style.pointerEvents = 'none';

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 90 + 50; // 50px to 140px burst
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - (Math.random() * 40 + 10); // add gravity arch
      const rot = Math.random() * 720 - 360;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.setProperty('--rot', `${rot}deg`);
      
      // Apply CSS animation
      particle.style.animation = 'confetti-burst 0.8s cubic-bezier(0.1, 0.8, 0.25, 1) forwards';

      document.body.appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, 850);
    }
  };

  const fetchCoupons = async () => {
    setLoading(true);
    setError(false);
    try {
      // Fetch all coupons and handle dynamic status filtering client-side for maximum reliability
      const res = await api.get('/coupons/');
      setCoupons(res.data);
    } catch {
      setError(true);
      addToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
    };
    try {
      if (editingId) {
        await api.put(`/coupons/${editingId}`, payload);
        addToast('Coupon updated', 'success');
      } else {
        await api.post('/coupons/', payload);
        addToast('Coupon saved', 'success');
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchCoupons();
    } catch (err) {
      addToast(err.response?.data?.detail || 'An error occurred', 'error');
    }
  };

  const handleMarkAsUsed = async (coupon) => {
    try {
      await api.put(`/coupons/${coupon.id}`, {
        title: coupon.title,
        code: coupon.code,
        pin: coupon.pin || '',
        category: coupon.category || '',
        expiry_date: coupon.expiry_date,
        description: coupon.description || '',
        status: 'used',
      });
      addToast('Coupon marked as used', 'success');
      fetchCoupons();
    } catch {
      addToast('Failed to update coupon status', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/coupons/${deleteTarget.id}`);
      addToast('Coupon deleted', 'success');
      setDeleteTarget(null);
      fetchCoupons();
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  const copyToClipboard = (e, text, label = 'Code') => {
    // Capture the target element synchronously from the event before async processing
    const targetElement = e ? (e.currentTarget || e.target) : null;
    navigator.clipboard.writeText(text).then(() => {
      addToast(`${label} copied!`, 'success');
      triggerConfetti(targetElement);
    }).catch(() => {
      addToast(`Failed to copy ${label.toLowerCase()}`, 'error');
    });
  };

  const openAdd = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (coupon) => {
    setFormData({
      title: coupon.title,
      code: coupon.code,
      pin: coupon.pin || '',
      category: coupon.category || '',
      expiry_date: coupon.expiry_date ? coupon.expiry_date.split('T')[0] : '',
      description: coupon.description || '',
      status: coupon.status,
    });
    setEditingId(coupon.id);
    setIsModalOpen(true);
  };

  // Calculate effective real-time status
  const getEffectiveStatus = (coupon) => {
    if (coupon.status === 'used') return 'used';
    if (coupon.expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = new Date(coupon.expiry_date);
      exp.setHours(0, 0, 0, 0);
      if (exp < today) return 'expired';
    }
    return 'active';
  };

  const processedCoupons = coupons.map(c => {
    const effectiveStatus = getEffectiveStatus(c);
    const reminderDays = couponPreferences?.expiryReminderDays ?? 3;
    const isExpiringSoon = c.expiry_date &&
      effectiveStatus === 'active' &&
      isBefore(new Date(c.expiry_date), addDays(new Date(), reminderDays));
    return { ...c, effectiveStatus, isExpiringSoon };
  });

  const categories = useMemo(() => {
    const cats = new Set();
    processedCoupons.forEach(c => {
      if (c.category) cats.add(c.category);
    });
    return ['All', ...Array.from(cats)];
  }, [processedCoupons]);

  const filteredCoupons = useMemo(() => {
    let result = processedCoupons;
    if (filter) {
      result = result.filter(c => c.effectiveStatus === filter);
    }
    if (selectedCategory !== 'All') {
      result = result.filter(c => (c.category || 'General') === selectedCategory);
    }
    return result;
  }, [processedCoupons, filter, selectedCategory]);

  const stats = useMemo(() => {
    const active = processedCoupons.filter(c => c.effectiveStatus === 'active').length;
    const expiring = processedCoupons.filter(c => c.isExpiringSoon).length;
    const used = processedCoupons.filter(c => c.effectiveStatus === 'used').length;
    const total = processedCoupons.length;
    
    const counts = {};
    processedCoupons.forEach(c => {
      const cat = c.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    let topCat = '—';
    let max = 0;
    Object.entries(counts).forEach(([cat, count]) => {
      if (count > max) {
        max = count;
        topCat = cat;
      }
    });
    
    return { active, expiring, used, total, topCat };
  }, [processedCoupons]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header utility bar */}
      <div className="flex justify-end gap-3 mb-6 pb-2 border-b border-white/5">
        <CustomSelect
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-auto"
          options={[
            { value: 'active',  label: 'Active' },
            { value: 'used',    label: 'Used' },
            { value: 'expired', label: 'Expired' },
            { value: '',        label: 'All Statuses' },
          ]}
        />
        <button onClick={openAdd} className="btn-primary whitespace-nowrap flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Coupon
        </button>
      </div>

      {/* Category Filter Pill Carousel */}
      {!loading && categories.length > 1 && (
        <div className="w-full py-2 border-b border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest pr-2 border-r border-white/5 flex items-center shrink-0">
              Categories
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pl-1">
              {categories.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all border shrink-0 ${
                      isActive
                        ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-slate-900/40 text-muted border-white/5 hover:text-main hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 0. Coupon Stats Analytics Row */}
      {!loading && processedCoupons.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted uppercase font-semibold tracking-wide">Active Coupons</span>
              <Ticket className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <span className="text-xl font-bold text-main">{stats.active}</span>
              <p className="text-[10px] text-muted mt-0.5">Valid and ready</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted uppercase font-semibold tracking-wide">Expiring Soon</span>
              <Hourglass className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div>
              <span className={`text-xl font-bold ${stats.expiring > 0 ? 'text-orange-400' : 'text-main'}`}>
                {stats.expiring}
              </span>
              <p className="text-[10px] text-muted mt-0.5">{stats.expiring > 0 ? 'Needs attention' : 'Fully secure'}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted uppercase font-semibold tracking-wide">Redeemed</span>
              <Check className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <span className="text-xl font-bold text-main">{stats.used}</span>
              <p className="text-[10px] text-muted mt-0.5">Marked as used</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col justify-between min-h-[90px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted uppercase font-semibold tracking-wide">Total Vouchers</span>
              <Tag className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold text-main">{stats.total}</span>
              <p className="text-[10px] text-muted mt-0.5 truncate" title={`Most Saved: ${stats.topCat}`}>Most Saved: {stats.topCat}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <SkeletonVault />
      ) : error ? (
        <ErrorState 
          title="Vault Access Error" 
          message="Failed to connect to the secure vault database. Check your connection or retry below." 
          onRetry={fetchCoupons} 
        />
      ) : filteredCoupons.length === 0 ? (

        <EmptyState 
          variant="dashed"
          icon={Tag}
          title="No Coupons Found"
          description="Save your discount codes so you never forget to use them at checkout."
          actionText="Add a Coupon"
          onAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCoupons.map(coupon => {
            const statusStyle = STATUS_COLORS[coupon.effectiveStatus] || STATUS_COLORS.active;
            const daysLeft = coupon.expiry_date ? Math.ceil((new Date(coupon.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div
                key={coupon.id}
                className={`card p-5 transition-all group relative hover:shadow-lg flex flex-col h-full ${
                  coupon.isExpiringSoon ? 'border-orange-500/40 bg-orange-500/[0.02]' : 'border-white/5'
                } ${coupon.effectiveStatus !== 'active' ? 'opacity-70 grayscale-[15%] scale-[0.99]' : ''}`}
                style={{
                  clipPath: 'radial-gradient(circle at 0px 65%, transparent 8px, white 8px), radial-gradient(circle at 100% 65%, transparent 8px, white 8px)',
                  WebkitClipPath: 'radial-gradient(circle at 0px 65%, transparent 8px, white 8px), radial-gradient(circle at 100% 65%, transparent 8px, white 8px)'
                }}
              >
                {/* Skeuomorphic Ticket Notches */}
                <div className="absolute -left-[1px] top-[65%] -translate-y-1/2 w-2 h-4 bg-[#040814] rounded-r-full border-r border-y border-white/10 z-10" />
                <div className="absolute -right-[1px] top-[65%] -translate-y-1/2 w-2 h-4 bg-[#040814] rounded-l-full border-l border-y border-white/10 z-10" />

                {coupon.isExpiringSoon && (
                  <div className="absolute top-0 right-0 bg-orange-500/15 text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 animate-pulse" /> Expiring Soon
                  </div>
                )}

                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                    {coupon.category || 'General'}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => openEdit(coupon)}
                      className="p-1.5 text-muted hover:text-primary rounded-xl hover:bg-primary/10 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(coupon)}
                      className="p-1.5 text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-main mb-1 truncate" title={coupon.title}>
                  {coupon.title}
                </h3>

                {coupon.expiry_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
                    <Calendar className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    <span className="truncate">Expires: {format(new Date(coupon.expiry_date), dFormat)}</span>
                  </div>
                )}

                {/* Skeuomorphic Ticket Divider Line */}
                <div className="border-t border-dashed border-white/10 my-4" />

                {/* Code box */}
                <div className="rounded-xl p-3 border border-white/5 mb-3" style={{ background: 'var(--background)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-main text-sm tracking-widest truncate select-all">{coupon.code}</span>
                    <button
                      onClick={(e) => copyToClipboard(e, coupon.code, 'Code')}
                      className="p-1.5 text-muted hover:text-primary hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all active:scale-95 shrink-0 flex items-center justify-center"
                      title="Copy code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {coupon.pin && (
                    <div className="mt-2 pt-2 flex items-center justify-between gap-2 border-t border-white/5">
                      <span className="text-xs text-muted">
                        PIN:{' '}
                        {showPin[coupon.id]
                          ? <span className="font-mono text-main ml-1 tracking-widest">{coupon.pin}</span>
                          : <span className="ml-1 tracking-widest">••••</span>
                        }
                      </span>
                      <button
                        onClick={() => setShowPin(p => ({ ...p, [coupon.id]: !p[coupon.id] }))}
                        className="text-muted hover:text-main transition-colors shrink-0"
                        title={showPin[coupon.id] ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin[coupon.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expiry Heat Bar / Countdown Timer */}
                {coupon.expiry_date && coupon.effectiveStatus === 'active' && (
                  <div className="mt-auto mb-3 pt-2">
                    <div className="flex justify-between items-center text-[10px] text-muted mb-1.5 font-semibold">
                      <span className="flex items-center gap-1">
                        <Hourglass className="w-3 h-3 text-muted" /> Timer
                      </span>
                      <span className={daysLeft <= 1 ? 'text-red-400 font-extrabold animate-pulse' : daysLeft <= 3 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                        {daysLeft <= 0 ? 'Expiring today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          daysLeft <= 1 ? 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse' : daysLeft <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(5, Math.min(100, (daysLeft / 30) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status and Mark Used Badge Section */}
                <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.dot }} />
                    <span className={`text-[11px] font-semibold capitalize tracking-wide ${statusStyle.text}`}>
                      {coupon.effectiveStatus}
                    </span>
                  </div>
                  {coupon.effectiveStatus === 'active' && (
                    <button
                      onClick={() => handleMarkAsUsed(coupon)}
                      className="text-[11px] font-medium text-muted hover:text-emerald-400 dark:hover:text-emerald-400 px-2 py-0.5 rounded-md border border-black/10 dark:border-white/10 hover:bg-emerald-500/10 transition-all flex items-center gap-1 group/btn"
                      title="Mark coupon as Used"
                    >
                      <Check className="w-3 h-3 text-muted group-hover/btn:text-emerald-400" /> Used
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingId(null); }}
        title={editingId ? 'Edit Coupon' : 'Add Coupon'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className="input-field"
              placeholder="e.g. Amazon 20% Off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                className="input-field"
                placeholder="e.g. Shopping"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Expiry Date</label>
              <PremiumDatePicker
                value={formData.expiry_date}
                onChange={val => setFormData(f => ({ ...f, expiry_date: val }))}
                popperPlacement="bottom-end"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Code</label>
              <input
                required
                type="text"
                value={formData.code}
                onChange={e => setFormData(f => ({ ...f, code: e.target.value }))}
                className="input-field font-mono"
                placeholder="SUMMER20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">PIN (Optional)</label>
              <input
                type="text"
                value={formData.pin}
                onChange={e => setFormData(f => ({ ...f, pin: e.target.value }))}
                className="input-field font-mono"
                placeholder="••••"
              />
            </div>
          </div>

          {editingId && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Status</label>
              <CustomSelect
                value={formData.status}
                onChange={v => setFormData(f => ({ ...f, status: v }))}
                options={[
                  { value: 'active',  label: 'Active' },
                  { value: 'used',    label: 'Used' },
                  { value: 'expired', label: 'Expired' },
                ]}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              className="input-field"
              rows={2}
              placeholder="Any notes about this coupon..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Coupon</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Coupon"
      >
        <div className="space-y-5">
          <p className="text-muted leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-main">"{deleteTarget?.title}"</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={confirmDelete} className="btn-danger">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

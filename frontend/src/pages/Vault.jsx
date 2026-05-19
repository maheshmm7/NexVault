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
  const [formData, setFormData]       = useState({ ...EMPTY_FORM });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { addToast } = useToast();

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

  const copyToClipboard = (text, label = 'Code') => {
    navigator.clipboard.writeText(text).then(() => {
      addToast(`${label} copied!`, 'success');
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

  const filteredCoupons = filter
    ? processedCoupons.filter(c => c.effectiveStatus === filter)
    : processedCoupons;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-2xl font-bold text-main tracking-tight">Coupon Vault</h1>
          <p className="text-muted mt-1">Store and manage your discount codes and vouchers.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
      </div>

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

            return (
              <div
                key={coupon.id}
                className={`card p-5 transition-all group relative overflow-hidden hover:shadow-lg flex flex-col h-full ${
                  coupon.isExpiringSoon ? 'border-orange-500/30' : ''
                } ${coupon.effectiveStatus !== 'active' ? 'opacity-80 grayscale-[20%] scale-[0.99]' : ''}`}
              >
                {coupon.isExpiringSoon && (
                  <div className="absolute top-0 right-0 bg-orange-500/15 text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Expiring Soon
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

                {/* Code box */}
                <div className="rounded-xl p-3 border mb-2" style={{ background: 'var(--background)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-main text-sm tracking-widest truncate select-all">{coupon.code}</span>
                    <button
                      onClick={() => copyToClipboard(coupon.code, 'Code')}
                      className="p-1.5 text-muted hover:text-primary hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all active:scale-95 shrink-0 flex items-center justify-center"
                      title="Copy code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {coupon.pin && (
                    <div className="mt-2 pt-2 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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

                {/* Status and Mark Used Badge Section */}
                <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

          <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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

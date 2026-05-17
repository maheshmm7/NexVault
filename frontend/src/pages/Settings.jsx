import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
    User, Bell, Tag, Clock, Sliders, Palette, Shield,
    ChevronRight, Camera, Upload, Trash2,
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { BRANDING } from '../config/branding';


// ─── Reusable Toggle ───────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer"
        style={{ backgroundColor: checked ? 'var(--primary)' : 'rgba(148, 163, 184, 0.3)' }}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

// ─── Section label inside a tab panel ──────────────────────────────────────────
const SectionTitle = ({ children, description }) => (
    <div className="mb-5">
        <h2 className="text-base font-semibold text-main">{children}</h2>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
    </div>
);

// ─── Divider ───────────────────────────────────────────────────────────────────
const Divider = () => (
    <div className="border-t my-5" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
);

// ─── Toggle Row ────────────────────────────────────────────────────────────────
const ToggleRow = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/[0.015] transition-all">
        <div>
            <p className="text-sm font-medium text-main">{label}</p>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
        <Toggle checked={checked} onChange={onChange} />
    </div>
);

// ─── Form Field ────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div>
        <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">{label}</label>
        {children}
    </div>
);

// ─── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
    { id: 'profile',      label: 'Profile',       icon: User },
    { id: 'security',     label: 'Security',      icon: Shield },
    { id: 'notifications',label: 'Notifications', icon: Bell },
    { id: 'coupon',       label: 'Coupon Vault',  icon: Tag },
    { id: 'datetime',     label: 'Date & Time',   icon: Clock },
    { id: 'preferences',  label: 'Preferences',   icon: Sliders },
    { id: 'appearance',   label: 'Appearance',    icon: Palette },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
    const { user, updateProfile } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('profile');

    // Profile states
    const [fullName,    setFullName]    = useState(user?.full_name   || '');
    const [displayName, setDisplayName] = useState(user?.display_name|| '');
    const [avatarUrl,   setAvatarUrl]   = useState(() => localStorage.getItem(`${BRANDING.STORAGE_PREFIX}_local_avatar`) || user?.avatar_url || '');

    const [email,       setEmail]       = useState(user?.email       || '');

    const fileInputRef = useRef(null);

    // Security states
    const [currentPassword,    setCurrentPassword]    = useState('');
    const [newPassword,        setNewPassword]        = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const {
        currency, setCurrency,
        theme,    setTheme,
        notifications,      setNotifications,
        couponPreferences,  setCouponPreferences,
        dateTimePreferences,setDateTimePreferences,
    } = useSettings();

    const [tempCurrency,       setTempCurrency]       = useState(currency);
    const [tempTheme,          setTempTheme]          = useState(theme);
    const [tempNotifications,  setTempNotifications]  = useState(notifications);
    const [tempCouponPrefs,    setTempCouponPrefs]    = useState(couponPreferences);
    const [tempDateTimePrefs,  setTempDateTimePrefs]  = useState(dateTimePreferences);

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (newPassword && newPassword.length < 6) {
            addToast('New password must be at least 6 characters long', 'error'); return;
        }
        if (newPassword && newPassword !== confirmNewPassword) {
            addToast('New passwords do not match', 'error'); return;
        }
        setIsSavingProfile(true);
        try {
            const payload = { full_name: fullName, display_name: displayName, avatar_url: avatarUrl, email };
            if (newPassword) { payload.current_password = currentPassword; payload.new_password = newPassword; }
            await updateProfile(payload);
            addToast('Profile updated successfully', 'success');
            setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to update profile', 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            addToast('Please upload a valid image (PNG, JPG, WEBP)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            setAvatarUrl(base64);
            localStorage.setItem(`${BRANDING.STORAGE_PREFIX}_local_avatar`, base64);
            window.dispatchEvent(new Event(BRANDING.AVATAR_UPDATE_EVENT));

        };
        reader.readAsDataURL(file);
        
        // Clear input value so same file can be uploaded again if removed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveAvatar = () => {
        setAvatarUrl('');
        localStorage.removeItem(`${BRANDING.STORAGE_PREFIX}_local_avatar`);
        window.dispatchEvent(new Event(BRANDING.AVATAR_UPDATE_EVENT));

    };

    const getInitials = (name) => {
        if (!name) return BRANDING.MONOGRAM[0];
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const avatarInitials = getInitials(displayName || fullName || email);

    const handleSaveNotifications  = () => { setNotifications(tempNotifications);     addToast('Notification preferences saved', 'success'); };
    const handleSaveCouponPrefs    = () => { setCouponPreferences(tempCouponPrefs);   addToast('Coupon vault preferences saved', 'success'); };
    const handleSaveDateTimePrefs  = () => { setDateTimePreferences(tempDateTimePrefs); addToast('Date & time preferences saved', 'success'); };
    const handleSavePreferences    = () => { setCurrency(tempCurrency);               addToast('Preferences saved', 'success'); };
    const handleSaveAppearance     = () => { setTheme(tempTheme);                     addToast('Appearance saved', 'success'); };

    const toggleCategoryVisibility = (category) => {
        setTempCouponPrefs(prev => ({
            ...prev,
            categoryVisibility: { ...prev.categoryVisibility, [category]: !prev.categoryVisibility[category] }
        }));
    };

    // ── Tab Panels ──────────────────────────────────────────────────────────────
    const panels = {
        profile: (
            <div className="space-y-5">
                <SectionTitle description="Manage your personal information and public profile.">
                    Profile Settings
                </SectionTitle>

                {/* Avatar */}
                <div className="flex items-center gap-6 p-4 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                    <div 
                        className="relative w-20 h-20 rounded-full border border-white/10 overflow-hidden flex items-center justify-center text-main shrink-0 group cursor-pointer"
                        style={{
                            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-bold tracking-wider">{avatarInitials}</span>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 backdrop-blur-[2px]">
                            <Camera className="w-5 h-5 text-white/90" />
                            <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">Change</span>
                        </div>
                    </div>

                    <div className="flex-1">
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp" 
                            ref={fileInputRef} 
                            onChange={handleAvatarUpload} 
                            className="hidden" 
                        />
                        <div className="flex flex-wrap items-center gap-3">
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-white/5"
                                style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}
                            >
                                <Upload className="w-4 h-4" />
                                Upload Photo
                            </button>
                            
                            {avatarUrl && (
                                <button 
                                    type="button" 
                                    onClick={handleRemoveAvatar}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remove
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-muted mt-2">Recommended: Square PNG, JPG, or WEBP.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name">
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="input-field" placeholder="Your full name" />
                    </Field>
                    <Field label="Display Name">
                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                            className="input-field" placeholder="Display moniker" />
                    </Field>
                </div>

                <Field label="Email Address">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
                </Field>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="btn-primary">
                        {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>
        ),

        security: (
            <div className="space-y-5">
                <SectionTitle description="Update your password to keep your account secure.">
                    Security Settings
                </SectionTitle>

                <div className="max-w-md space-y-4 p-5 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 className="text-sm font-semibold text-main">Change Password</h3>
                    <Field label="Current Password">
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input-field" placeholder="••••••••" />
                    </Field>
                    <Field label="New Password">
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="input-field" placeholder="••••••••" />
                    </Field>
                    <Field label="Confirm New Password">
                        <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="input-field" placeholder="••••••••" />
                    </Field>
                </div>

                <div className="flex justify-end">
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="btn-primary">
                        {isSavingProfile ? 'Saving...' : 'Update Password'}
                    </button>
                </div>
            </div>
        ),

        notifications: (
            <div className="space-y-2">
                <SectionTitle description="Manage your system alerts and reminder configurations.">
                    Notification Preferences
                </SectionTitle>
                <ToggleRow label="Bill Reminders" description="Get alerted before your accounts or bills are due"
                    checked={tempNotifications.billReminders}
                    onChange={(v) => setTempNotifications(p => ({ ...p, billReminders: v }))} />
                <ToggleRow label="Coupon Expiry Alerts" description="Notifications for coupons nearing expiration dates"
                    checked={tempNotifications.couponExpiry}
                    onChange={(v) => setTempNotifications(p => ({ ...p, couponExpiry: v }))} />
                <ToggleRow label="Monthly Financial Summaries" description="A detailed rundown of your cash flow at month end"
                    checked={tempNotifications.monthlySummaries}
                    onChange={(v) => setTempNotifications(p => ({ ...p, monthlySummaries: v }))} />
                <ToggleRow label="Credit Utilization Alerts" description="Warn me when credit utilization exceeds safe limits"
                    checked={tempNotifications.creditUtilization}
                    onChange={(v) => setTempNotifications(p => ({ ...p, creditUtilization: v }))} />
                <div className="flex justify-end pt-3">
                    <button onClick={handleSaveNotifications} className="btn-primary">Save Preferences</button>
                </div>
            </div>
        ),

        coupon: (
            <div className="space-y-5">
                <SectionTitle description="Configure expiry behaviors, tracking logic, and category organization.">
                    Coupon Vault Preferences
                </SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ToggleRow label="Auto-Hide Expired" description="Hide expired items from main dashboard lists"
                        checked={tempCouponPrefs.autoHideExpired}
                        onChange={(v) => setTempCouponPrefs(p => ({ ...p, autoHideExpired: v }))} />
                    <ToggleRow label="Auto-Mark Expired" description="Mark coupons as expired once their date passes"
                        checked={tempCouponPrefs.autoMarkExpired}
                        onChange={(v) => setTempCouponPrefs(p => ({ ...p, autoMarkExpired: v }))} />
                </div>

                <Divider />

                <div className="max-w-xs">
                    <Field label="Expiry Reminder Window (Days)">
                        <p className="text-xs text-muted mb-2">How many days before expiry to flag a coupon as "Expiring Soon".</p>
                        <input type="number" min="1" max="60"
                            value={tempCouponPrefs.expiryReminderDays}
                            onChange={(e) => setTempCouponPrefs(p => ({ ...p, expiryReminderDays: parseInt(e.target.value) || 1 }))}
                            className="input-field max-w-[120px]" />
                    </Field>
                </div>

                <Divider />

                <div>
                    <p className="text-sm font-medium text-main mb-1">Category Visibility</p>
                    <p className="text-xs text-muted mb-3">Toggle which coupon categories are displayed by default.</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(tempCouponPrefs.categoryVisibility || {}).map(([cat, isVisible]) => (
                            <button key={cat} type="button" onClick={() => toggleCategoryVisibility(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                                    isVisible ? 'bg-primary/15 text-primary border-primary/30' : 'bg-white/[0.02] text-muted border-white/5 hover:border-white/10'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isVisible ? 'bg-primary animate-pulse' : 'bg-muted/50'}`} />
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSaveCouponPrefs} className="btn-primary">Save Preferences</button>
                </div>
            </div>
        ),

        datetime: (
            <div className="space-y-5">
                <SectionTitle description="Set your localization settings for timestamps and calendars.">
                    Date & Time Preferences
                </SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                        <Field label="Date Format">
                            <CustomSelect
                                value={tempDateTimePrefs.dateFormat}
                                onChange={v => setTempDateTimePrefs(p => ({ ...p, dateFormat: v }))}
                                options={[
                                    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (15/05/2026)' },
                                    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (05/15/2026)' },
                                    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2026-05-15)' },
                                ]}
                            />
                        </Field>
                        <p className="text-[10px] text-muted mt-1.5">Controls transaction history headers.</p>
                    </div>
                    <div>
                        <Field label="Time Format">
                            <CustomSelect
                                value={tempDateTimePrefs.timeFormat}
                                onChange={v => setTempDateTimePrefs(p => ({ ...p, timeFormat: v }))}
                                options={[
                                    { value: '12h', label: '12-Hour (02:30 PM)' },
                                    { value: '24h', label: '24-Hour (14:30)' },
                                ]}
                            />
                        </Field>
                        <p className="text-[10px] text-muted mt-1.5">Sets timestamp suffix display.</p>
                    </div>
                    <div>
                        <Field label="Week Starts On">
                            <CustomSelect
                                value={tempDateTimePrefs.weekStart}
                                onChange={v => setTempDateTimePrefs(p => ({ ...p, weekStart: v }))}
                                options={[
                                    { value: 'Monday', label: 'Monday' },
                                    { value: 'Sunday', label: 'Sunday' },
                                ]}
                            />
                        </Field>
                        <p className="text-[10px] text-muted mt-1.5">Adjusts monthly calendar offset.</p>
                    </div>
                </div>

                {/* Real-time Preview block */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mt-2">
                    <div>
                        <span className="text-xs font-semibold text-main block mb-0.5">Localization Preview</span>
                        <p className="text-[10px] text-muted">Instant configuration outcome representation.</p>
                    </div>
                    <div className="bg-black/20 dark:bg-black/40 border border-white/5 rounded-lg px-4 py-2 text-sm font-mono text-primary tracking-wide">
                        {(() => {
                            let d = "15/05/2026";
                            if (tempDateTimePrefs.dateFormat === 'MM/dd/yyyy') d = "05/15/2026";
                            else if (tempDateTimePrefs.dateFormat === 'yyyy-MM-dd') d = "2026-05-15";
                            let t = "02:30 PM";
                            if (tempDateTimePrefs.timeFormat === '24h') t = "14:30";
                            return `${d} | ${t} | ${tempDateTimePrefs.weekStart}`;
                        })()}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSaveDateTimePrefs} className="btn-primary">Save Preferences</button>
                </div>
            </div>
        ),

        preferences: (
            <div className="space-y-5">
                <SectionTitle description="Configure currency and regional preferences.">
                    App Preferences
                </SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Field label="Base Currency">
                            <CustomSelect
                                value={tempCurrency}
                                onChange={setTempCurrency}
                                options={[
                                    { value: 'INR', label: 'INR (₹)' },
                                    { value: 'USD', label: 'USD ($)' },
                                    { value: 'EUR', label: 'EUR (€)' },
                                ]}
                            />
                        </Field>
                        <p className="text-xs text-muted leading-relaxed">
                            Adjusts default formatting tags globally. Affects ledger summaries, charts, accounts balances, and transaction records.
                        </p>
                    </div>

                    {/* Currency Preview Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-center min-h-[100px]">
                        <span className="text-xs text-muted uppercase font-semibold tracking-wider block mb-2">Format Snapshot</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-main">
                                {tempCurrency === 'INR' ? '₹' : tempCurrency === 'EUR' ? '€' : '$'}
                                1,250.00
                            </span>
                            <span className="text-xs text-muted">(Example Value)</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSavePreferences} className="btn-primary">Save Preferences</button>
                </div>
            </div>
        ),

        appearance: (
            <div className="space-y-5">
                <SectionTitle description="Customize the visual theme of your dashboard.">
                    Appearance
                </SectionTitle>

                <div className="space-y-3">
                    <Field label="Interface Theme">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 max-w-md">
                            <button
                                type="button"
                                onClick={() => setTempTheme('dark')}
                                className={`flex flex-col p-3 rounded-xl border transition-all text-left group cursor-pointer ${
                                    tempTheme === 'dark' ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                }`}
                            >
                                <div className="w-full aspect-[16/10] rounded-lg border border-white/5 bg-[#0D0F14] p-2 flex flex-col justify-between mb-3 overflow-hidden shadow-inner shrink-0">
                                    <div className="w-1/2 h-1.5 bg-white/20 rounded-sm mb-1" />
                                    <div className="flex gap-1 h-full">
                                        <div className="w-1/3 bg-white/5 rounded border border-white/5" />
                                        <div className="flex-1 flex flex-col gap-1">
                                            <div className="h-1/2 bg-primary/20 border border-primary/20 rounded" />
                                            <div className="flex-1 bg-white/5 rounded" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-sm font-semibold text-main">Dark Mode</span>
                                    {tempTheme === 'dark' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTempTheme('light')}
                                className={`flex flex-col p-3 rounded-xl border transition-all text-left group cursor-pointer ${
                                    tempTheme === 'light' ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                }`}
                            >
                                <div className="w-full aspect-[16/10] rounded-lg border border-black/5 bg-[#f8fafc] p-2 flex flex-col justify-between mb-3 overflow-hidden shadow-inner shrink-0">
                                    <div className="w-1/2 h-1.5 bg-black/20 rounded-sm mb-1" />
                                    <div className="flex gap-1 h-full">
                                        <div className="w-1/3 bg-black/5 rounded border border-black/5" />
                                        <div className="flex-1 flex flex-col gap-1">
                                            <div className="h-1/2 bg-primary/20 border border-primary/20 rounded" />
                                            <div className="flex-1 bg-black/5 rounded" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-sm font-semibold text-main">Light Mode</span>
                                    {tempTheme === 'light' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                            </button>
                        </div>
                    </Field>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSaveAppearance} className="btn-primary">Save Appearance</button>
                </div>
            </div>
        ),
    };

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-main tracking-tight">Settings</h1>
                <p className="text-muted mt-1 text-sm">Manage your account preferences and application settings.</p>
            </div>

            {/* Tab Layout */}
            <div className="flex flex-col md:flex-row gap-5 min-h-[500px]">

                {/* Left Tab Nav */}
                <aside className="md:w-52 shrink-0">
                    <nav className="card p-2 space-y-0.5">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                                        isActive
                                            ? 'text-primary border border-primary/20'
                                            : 'text-muted hover:text-main hover:bg-white/[0.04] border border-transparent'
                                    }`}
                                    style={isActive ? { background: 'rgba(59,130,246,0.08)' } : {}}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {label}
                                    </div>
                                    {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Right Content Panel */}
                <div className="flex-1 card p-6 min-w-0">
                    {panels[activeTab]}
                </div>
            </div>
        </div>
    );
}
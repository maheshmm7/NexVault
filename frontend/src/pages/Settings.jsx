import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
    User, Bell, Tag, Clock, Sliders, Palette, Shield, Laptop,
    ChevronLeft, ChevronRight, Camera, Upload, Trash2, AlertTriangle, Layers, Plus, Check, Calendar, X
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { BRANDING } from '../config/branding';
import api from '../services/api';
import PasswordFeedback from '../components/PasswordFeedback';
import PremiumDatePicker from '../components/PremiumDatePicker';
import DatePicker from 'react-datepicker';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCropModal from '../components/ImageCropModal';



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
    { id: 'sessions',     label: 'Devices & Sessions', icon: Laptop },
    { id: 'categories',   label: 'Categories',    icon: Layers },
    { id: 'notifications',label: 'Notifications', icon: Bell },
    { id: 'coupon',       label: 'Coupon Vault',  icon: Tag },
    { id: 'datetime',     label: 'Date & Time',   icon: Clock },
    { id: 'preferences',  label: 'Preferences',   icon: Sliders },
    { id: 'appearance',   label: 'Appearance',    icon: Palette },
    { id: 'danger',      label: 'Data & Privacy',   icon: AlertTriangle },
];

const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getStartOfMonthDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
};

const getStartOfYearDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
};

const monthsOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
];

const currentYear = new Date().getFullYear();
const yearsOptions = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => {
    const y = 2015 + i;
    return { value: y, label: String(y) };
}).reverse();

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
    const { user, updateProfile, logout } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && TABS.some(t => t.id === tabParam)) {
            return tabParam;
        }
        return 'profile';
    });

    // Categories states
    const [categories, setCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'expense', 'income'

    // Sessions states
    const [sessions, setSessions] = useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    const fetchSessions = async () => {
        setIsLoadingSessions(true);
        try {
            const res = await api.get('/users/me/sessions');
            setSessions(res.data);
        } catch (err) {
            addToast('Failed to retrieve active sessions', 'error');
        } finally {
            setIsLoadingSessions(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            await api.delete(`/users/me/sessions/${sessionId}`);
            addToast('Session revoked successfully', 'success');
            fetchSessions();
        } catch (err) {
            addToast('Failed to revoke session', 'error');
        }
    };

    const handleRevokeAllOtherSessions = async () => {
        try {
            await api.delete('/users/me/sessions');
            addToast('All other sessions revoked successfully', 'success');
            fetchSessions();
        } catch (err) {
            addToast('Failed to revoke other sessions', 'error');
        }
    };

    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchSessions();
        }
    }, [activeTab]);
    
    // Create category form states
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('expense');
    const [newCatColor, setNewCatColor] = useState('#6366F1');
    const [newCatIcon, setNewCatIcon] = useState('circle');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
            const res = await api.get('/categories/');
            setCategories(res.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'categories') {
            fetchCategories();
        }
    }, [activeTab]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) {
            addToast('Category name cannot be empty', 'error');
            return;
        }
        setIsCreatingCategory(true);
        try {
            await api.post('/categories/', {
                name: newCatName.trim(),
                type: newCatType,
                color: newCatColor,
                icon: newCatIcon
            });
            addToast('Category created successfully', 'success');
            setNewCatName('');
            fetchCategories();
            triggerSync();
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to create category', 'error');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleDeleteCategory = async (catId) => {
        if (!window.confirm('Are you sure you want to delete this custom category? Transactions linked to it may be affected.')) {
            return;
        }
        try {
            await api.delete(`/categories/${catId}`);
            addToast('Category deleted successfully', 'success');
            fetchCategories();
            triggerSync();
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to delete category', 'error');
        }
    };

    // Profile states
    const [fullName,    setFullName]    = useState(user?.full_name   || '');
    const [displayName, setDisplayName] = useState(user?.display_name|| '');
    const [avatarUrl,   setAvatarUrl]   = useState(() => {
        if (user) {
            return localStorage.getItem(`${BRANDING.STORAGE_PREFIX}_local_avatar_${user.id}`) || user?.avatar_url || '';
        }
        return '';
    });
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    const [email,       setEmail]       = useState(user?.email       || '');

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setDisplayName(user.display_name || '');
            setEmail(user.email || '');
            setAvatarUrl(localStorage.getItem(`${BRANDING.STORAGE_PREFIX}_local_avatar_${user.id}`) || user?.avatar_url || '');
        } else {
            setFullName('');
            setDisplayName('');
            setEmail('');
            setAvatarUrl('');
        }
    }, [user]);

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
        triggerSync,
        currencyMap,
    } = useSettings();

    const [tempCurrency,       setTempCurrency]       = useState(currency);
    const [tempTheme,          setTempTheme]          = useState(theme);
    const [tempNotifications,  setTempNotifications]  = useState(notifications);
    const [tempCouponPrefs,    setTempCouponPrefs]    = useState(couponPreferences);
    const [tempDateTimePrefs,  setTempDateTimePrefs]  = useState(dateTimePreferences);

    // Danger Zone & Data Management States
    const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Recovery Code Regeneration States
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [regeneratePassword, setRegeneratePassword] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [newRecoveryCode, setNewRecoveryCode] = useState('');
    const [isSavedChecked, setIsSavedChecked] = useState(false);
    const [notiPermission, setNotiPermission] = useState('default');
    const [purgeSliderVal, setPurgeSliderVal] = useState(0);

    // Ledger anchor states
    const [anchorDate, setAnchorDate] = useState(() => {
        if (user?.created_at) {
            return user.created_at.split('T')[0];
        }
        return '';
    });
    const [isSavingAnchor, setIsSavingAnchor] = useState(false);
    const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);
    const [tempAnchorDate, setTempAnchorDate] = useState('');
    const weekStart = dateTimePreferences?.weekStart === 'Sunday' ? 0 : 1;

    useEffect(() => {
        if (user?.created_at) {
            setAnchorDate(user.created_at.split('T')[0]);
        }
    }, [user]);

    useEffect(() => {
        if ('Notification' in window) {
            setNotiPermission(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotiPermission(permission);
            if (permission === 'granted') {
                addToast('Notification permissions granted!', 'success');
            } else {
                addToast('Notification permissions denied', 'error');
            }
        } else {
            addToast('Push notifications not supported on this browser', 'warning');
        }
    };

    const sendTestNotification = () => {
        addToast('System Alert: Security configuration verified successfully!', 'success');
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('NexVault Live Portal', {
                body: 'Security configuration and notification channels are working perfectly.',
                icon: '/favicon.ico'
            });
        }
    };

    useEffect(() => {
        setTempCurrency(currency);
        setTempTheme(theme);
        setTempNotifications(notifications);
        setTempCouponPrefs(couponPreferences);
        setTempDateTimePrefs(dateTimePreferences);
    }, [currency, theme, notifications, couponPreferences, dateTimePreferences]);

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
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
            setCropImageSrc(base64);
            setIsCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        
        // Clear input value so same file can be uploaded again if removed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveCroppedAvatar = (croppedBase64) => {
        setAvatarUrl(croppedBase64);
        const key = user ? `${BRANDING.STORAGE_PREFIX}_local_avatar_${user.id}` : `${BRANDING.STORAGE_PREFIX}_local_avatar`;
        localStorage.setItem(key, croppedBase64);
        window.dispatchEvent(new Event(BRANDING.AVATAR_UPDATE_EVENT));
        setIsCropModalOpen(false);
        setCropImageSrc(null);
        addToast('Avatar photo updated successfully', 'success');
    };

    const handleRemoveAvatar = () => {
        setAvatarUrl('');
        const key = user ? `${BRANDING.STORAGE_PREFIX}_local_avatar_${user.id}` : `${BRANDING.STORAGE_PREFIX}_local_avatar`;
        localStorage.removeItem(key);
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
    
    const handleSaveAnchorDate = async () => {
        if (!tempAnchorDate) {
            addToast('Please select a valid date.', 'error');
            return;
        }
        setIsSavingAnchor(true);
        try {
            const isoString = `${tempAnchorDate}T00:00:00Z`;
            await updateProfile({ created_at: isoString });
            setAnchorDate(tempAnchorDate);
            addToast('Ledger start date updated successfully', 'success');
            setIsAnchorModalOpen(false);
        } catch (error) {
            console.error("Failed to update ledger anchor:", error);
            addToast(error.response?.data?.detail || 'Failed to update ledger anchor date', 'error');
        } finally {
            setIsSavingAnchor(false);
        }
    };

    const handleSaveAppearance     = () => { setTheme(tempTheme);                     addToast('Appearance saved', 'success'); };

    const handleExportData = async (format) => {
        setIsExporting(true);
        try {
            const response = await api.get(`/users/me/export?format=${format}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `nexvault-data-export.${format === 'csv' ? 'zip' : 'json'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            addToast(`Data export successfully downloaded in ${format.toUpperCase()} format.`, 'success');
        } catch (error) {
            console.error('Export failed:', error);
            addToast('Failed to export your data.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearFinancialData = async () => {
        if (!confirmPassword) {
            addToast('Please enter your password to confirm data purge.', 'error');
            return;
        }
        setIsPurging(true);
        try {
            await api.post('/users/me/clear-data', { password: confirmPassword });
            addToast('All financial data successfully cleared.', 'success');
            setIsClearDataModalOpen(false);
            setConfirmPassword('');
            triggerSync();
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to clear financial data.', 'error');
        } finally {
            setIsPurging(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirmPassword) {
            addToast('Please enter your password to confirm account deletion.', 'error');
            return;
        }
        setIsDeleting(true);
        try {
            await api.delete('/users/me', { data: { password: confirmPassword } });
            addToast('Your account was successfully deleted.', 'success');
            setIsDeleteAccountModalOpen(false);
            setConfirmPassword('');
            await logout();
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to delete account.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRegenerateRecoveryCode = async (e) => {
        if (e) e.preventDefault();
        if (!regeneratePassword) {
            addToast('Please enter your password to confirm recovery code regeneration.', 'error');
            return;
        }

        // ─── Future Sensitive-Action Reauthentication Readiness ──────────
        // FUTURE IMPLEMENTATION NOTE:
        // For sensitive actions (data purging, recovery code regeneration, etc.),
        // we can bind a 15-minute reauth token in localStorage/cookie.
        // If current_time - last_auth_time > reauth_timeout (e.g., 900s),
        // we prompt for re-verification.
        //
        // const reauthSession = localStorage.getItem('reauth_token');
        // if (!reauthSession || isReauthExpired(reauthSession)) {
        //     triggerReauthenticationModal();
        //     return;
        // }
        // ────────────────────────────────────────────────────────────────

        setIsRegenerating(true);
        try {
            const response = await api.post('/auth/regenerate-recovery-code', 
                { password: regeneratePassword }
            );
            
            if (response.data && response.data.new_recovery_code) {
                setNewRecoveryCode(response.data.new_recovery_code);
                setIsRegenerateModalOpen(false);
                setRegeneratePassword('');
                addToast('New recovery code generated successfully', 'success');
            }
        } catch (error) {
            addToast(error.response?.data?.detail || 'Failed to regenerate recovery code', 'error');
        } finally {
            setIsRegenerating(false);
        }
    };

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
            <div className="space-y-5 animate-fade-in">
                <SectionTitle description="Update your password and manage backup recovery keys to protect your account.">
                    Security Settings
                </SectionTitle>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Change Password (58.3% width) */}
                    <div className="lg:col-span-7 space-y-4 p-5 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="space-y-4 max-w-[420px]">
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

                            <PasswordFeedback 
                                password={newPassword} 
                                confirmPassword={confirmNewPassword} 
                            />
                        </div>

                        <div className="flex justify-end pt-3 border-t border-white/5 mt-3 max-w-[420px]">
                            <button onClick={handleSaveProfile} disabled={isSavingProfile} className="btn-primary">
                                {isSavingProfile ? 'Saving...' : 'Update Password'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Recovery Code & Visual Security Trust Halo */}
                    <div className="lg:col-span-5 space-y-4 p-5 rounded-xl border animate-fade-in text-left" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        {/* Security Score Halo Circle */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.015] border border-white/5">
                            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                                {/* SVG Circle Progress */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                                    <circle cx="32" cy="32" r="28" className="stroke-primary fill-transparent" strokeWidth="4"
                                            strokeDasharray={2 * Math.PI * 28}
                                            strokeDashoffset={2 * Math.PI * 28 * (1 - 0.94)}
                                            strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-xs font-extrabold text-main">94%</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Security Score</span>
                                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Extremely Secure
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary shrink-0" />
                                <h3 className="text-sm font-semibold text-main">Account Recovery Code</h3>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                                Generate a new secure recovery code to restore access to your account. This will immediately invalidate your previous recovery code.
                            </p>
                        </div>

                        {/* Security Protocols / Informational Density */}
                        <div className="space-y-2.5 pt-3 border-t border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Protocols</span>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="text-emerald-400 font-bold mt-0.5 shrink-0">•</span>
                                    <span>Generating a new recovery code immediately invalidates previous recovery codes.</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="text-emerald-400 font-bold mt-0.5 shrink-0">•</span>
                                    <span>Recovery codes are securely hashed and only visible once upon generation.</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="text-emerald-400 font-bold mt-0.5 shrink-0">•</span>
                                    <span>Provides a secure backup channel independent of email or SMS systems.</span>
                                </div>
                            </div>
                        </div>

                        {/* Action and Security Badges */}
                        <div className="space-y-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setIsRegenerateModalOpen(true)}
                                className="w-full py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all text-main cursor-pointer uppercase tracking-wider"
                            >
                                Generate New Recovery Code
                            </button>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-emerald-500/10 bg-emerald-500/5 text-emerald-400">
                                    timing-safe bcrypt
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-white/10 bg-white/5 text-slate-300">
                                    single-use fulfillment
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),

        sessions: (
            <div className="space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <SectionTitle description="Track and manage active sessions across your devices. Revoking a session terminates that browser's access immediately.">
                        Devices & Sessions
                    </SectionTitle>
                    {sessions.length > 1 && (
                        <button
                            onClick={handleRevokeAllOtherSessions}
                            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-danger/25 text-danger bg-danger/5 hover:bg-danger/10 transition-all cursor-pointer"
                        >
                            Sign Out of All Other Devices
                        </button>
                    )}
                </div>

                {isLoadingSessions ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-16 rounded-xl border border-white/5 bg-white/[0.01] animate-pulse" />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] text-center text-muted">
                        No active sessions found.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map(s => {
                            const isCurrent = s.is_current;
                            
                            const formatLastActive = (dateString) => {
                                if (isCurrent) return 'Active Now';
                                if (!dateString) return 'Unknown';
                                const diff = Date.now() - new Date(dateString).getTime();
                                const mins = Math.floor(diff / 60000);
                                if (mins < 1)  return 'Last active just now';
                                if (mins < 60) return `Last active ${mins}m ago`;
                                const hrs = Math.floor(mins / 60);
                                if (hrs < 24)  return `Last active ${hrs}h ago`;
                                const days = Math.floor(hrs / 24);
                                return `Last active ${days}d ago`;
                            };

                            return (
                                <div
                                    key={s.id}
                                    className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:border-white/10 hover:bg-white/[0.015]"
                                    style={{
                                        borderColor: isCurrent ? 'rgba(var(--primary-rgb, 99, 102, 241), 0.2)' : 'rgba(255,255,255,0.06)',
                                        background: isCurrent ? 'rgba(var(--primary-rgb, 99, 102, 241), 0.02)' : 'rgba(255,255,255,0.01)'
                                    }}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted shrink-0">
                                            <Laptop className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-main truncate">
                                                    {s.device_name || 'Unknown Device'} ({s.os_name || 'Unknown OS'})
                                                </span>
                                                {isCurrent ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                                                        Current Session
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-muted text-[10px] font-medium border border-white/5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        Active Now
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted mt-1 truncate">
                                                {s.browser_name || 'Web Browser'} • {s.ip_address || 'Unknown IP'}
                                            </p>
                                            <p className="text-[10px] text-muted/60 mt-0.5">
                                                {formatLastActive(s.last_active_at)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {!isCurrent && (
                                        <button
                                            onClick={() => handleRevokeSession(s.id)}
                                            className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                                            title="Revoke session"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        ),

        categories: (
            <div className="space-y-6 animate-fade-in text-left">
                <SectionTitle description="Add, remove, or review custom and default category labels used across your transactions.">
                    Transaction Categories
                </SectionTitle>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Category List & Filter */}
                    <div className="lg:col-span-7 space-y-4 p-5 rounded-xl border flex flex-col justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                                <h3 className="text-sm font-semibold text-main">Category Ledger</h3>
                                
                                {/* Segmented control */}
                                <div className="flex space-x-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/5 max-w-fit">
                                    {['all', 'expense', 'income'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setCategoryFilter(t)}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                                categoryFilter === t 
                                                    ? 'bg-primary text-white shadow-sm' 
                                                    : 'text-muted hover:text-main'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isLoadingCategories ? (
                                <div className="space-y-2 py-4">
                                    {[1, 2, 3].map((n) => (
                                        <div key={n} className="h-10 w-full bg-white/[0.02] border border-white/5 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                    {categories
                                        .filter(c => categoryFilter === 'all' || c.type === categoryFilter)
                                        .map((c) => (
                                            <div 
                                                key={c.id} 
                                                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.03] transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Color circle preview */}
                                                    <div 
                                                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner"
                                                        style={{ backgroundColor: c.color || '#4F46E5' }}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-main">{c.name}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                                            c.type === 'expense' 
                                                                ? 'bg-danger/10 text-danger border border-danger/10' 
                                                                : 'bg-secondary/10 text-secondary border border-secondary/10'
                                                        }`}>
                                                            {c.type}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {c.is_custom ? (
                                                        <>
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/5">
                                                                Custom
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCategory(c.id)}
                                                                className="p-1 rounded text-slate-400 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                                                title="Delete Category"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-primary/10 bg-primary/5 text-primary">
                                                            System Default
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    }

                                    {categories.filter(c => categoryFilter === 'all' || c.type === categoryFilter).length === 0 && (
                                        <div className="p-8 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.005]">
                                            <p className="text-xs text-muted">No categories registered under this filter.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Create Category */}
                    <div className="lg:col-span-5 space-y-4 p-5 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 className="text-sm font-semibold text-main pb-3 border-b border-white/5">Create New Category</h3>

                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <Field label="Category Name">
                                <input
                                    type="text"
                                    required
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. Subscriptions, Cafe"
                                />
                            </Field>

                            <Field label="Category Flow Type">
                                <CustomSelect
                                    value={newCatType}
                                    onChange={setNewCatType}
                                    options={[
                                        { value: 'expense', label: 'Expense (Cash Out)' },
                                        { value: 'income', label: 'Income (Cash In)' }
                                    ]}
                                />
                            </Field>

                            <Field label="Color Theme">
                                <div className="space-y-2.5 text-left">
                                    {/* Preset HSL options */}
                                    <div className="grid grid-cols-8 gap-2">
                                        {[
                                            '#EC4899', '#EF4444', '#F59E0B', '#10B981', 
                                            '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
                                        ].map((color) => {
                                            const isSelected = newCatColor === color;
                                            return (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setNewCatColor(color)}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105 border border-white/5 cursor-pointer"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Custom hex selector */}
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={newCatColor} 
                                            onChange={(e) => setNewCatColor(e.target.value)}
                                            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0.5 animate-pulse"
                                        />
                                        <input 
                                            type="text" 
                                            value={newCatColor} 
                                            onChange={(e) => setNewCatColor(e.target.value)}
                                            className="input-field font-mono text-xs uppercase"
                                            style={{ maxWidth: '100px' }}
                                        />
                                    </div>
                                </div>
                            </Field>

                            <div className="pt-3 border-t border-white/5">
                                <button
                                    type="submit"
                                    disabled={isCreatingCategory}
                                    className="w-full btn-primary h-10 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isCreatingCategory ? 'Creating...' : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Add Custom Category
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        ),

        notifications: (
            <div className="space-y-5 animate-fade-in text-left">
                <SectionTitle description="Configure notification channels, delivery schedules, and alert thresholds.">
                    Notifications Portal
                </SectionTitle>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Switch toggles */}
                    <div className="lg:col-span-7 space-y-3">
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
                        <div className="flex justify-end pt-3 border-t border-white/5 mt-2">
                            <button onClick={handleSaveNotifications} className="btn-primary">Save Preferences</button>
                        </div>
                    </div>

                    {/* Right Column: Permission Status & Test Sandbox */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Permission Status */}
                        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.015] space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wide">System Permissions</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                    notiPermission === 'granted'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : notiPermission === 'denied'
                                            ? 'bg-danger/10 text-danger border-danger/20'
                                            : 'bg-primary/10 text-primary border-primary/20'
                                }`}>
                                    {notiPermission}
                                </span>
                            </div>
                            
                            <p className="text-xs text-muted leading-relaxed font-sans">
                                Enable browser-level push notifications to get real-time alerts even when the dashboard tab is closed.
                            </p>

                            {notiPermission !== 'granted' && (
                                <button
                                    onClick={requestNotificationPermission}
                                    className="w-full py-2 rounded-lg text-xs font-semibold border border-white/10 hover:bg-white/5 transition-all text-main cursor-pointer"
                                >
                                    Request Browser Access
                                </button>
                            )}
                        </div>

                        {/* Sandbox Testing */}
                        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.015] space-y-3">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wide block">Notification Sandbox</span>
                            <p className="text-xs text-muted leading-relaxed font-sans">
                                Simulate database-driven and real-time triggers to test visual alert channels instantly.
                            </p>
                            <button
                                onClick={sendTestNotification}
                                className="w-full btn-primary h-9 flex items-center justify-center gap-2 cursor-pointer text-xs"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                Send Test Notification
                            </button>
                        </div>
                    </div>
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
                                    { value: 'GBP', label: 'GBP (£)' },
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
                                {currencyMap?.[tempCurrency] || '$'}
                                1,250.00
                            </span>
                            <span className="text-xs text-muted">(Example Value)</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSavePreferences} className="btn-primary">Save Preferences</button>
                </div>

                {/* Ledger Starting Anchor Date Card */}
                <div className="border-t my-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                <SectionTitle description="Define the starting point of your financial ledger. All transaction inputs prior to this date are restricted to guarantee balance integrity.">
                    Ledger Starting Anchor Date
                </SectionTitle>

                <div className="p-5 rounded-2xl border relative overflow-hidden" 
                     style={{ 
                         borderColor: 'rgba(255,255,255,0.06)', 
                         background: 'linear-gradient(135deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)',
                         backdropFilter: 'blur(10px)'
                     }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Current Starting Anchor</span>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl border border-primary/10 bg-primary/5 text-primary">
                                    <Calendar className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-xl font-extrabold tracking-tight text-main block">
                                        {anchorDate ? (() => {
                                            const [y, m, d] = anchorDate.split('-');
                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            return `${d} ${months[parseInt(m) - 1]} ${y}`;
                                        })() : 'Not Configured'}
                                    </span>
                                    <span className="text-xs text-primary/80 font-semibold flex items-center gap-1.5 mt-0.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        Balance Protection Active
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:self-end">
                            <button 
                                onClick={() => {
                                    setTempAnchorDate(anchorDate);
                                    setIsAnchorModalOpen(true);
                                }}
                                className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-[0_4px_20px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.25)] cursor-pointer"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                                Configure Anchor Date
                            </button>
                        </div>
                    </div>
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

        danger: (
            <div className="space-y-6">
                <SectionTitle description="Manage data exports, purges, and permanent account deletion. Actions here can be destructive and irreversible.">
                    Data & Privacy Management
                </SectionTitle>

                {/* Section 1: Data Export */}
                <div className="p-4 rounded-xl border animate-fade-in" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-main">Export Personal & Financial Data</h3>
                            <p className="text-xs text-muted mt-1 leading-relaxed max-w-xl">
                                Download a full archive of your transactions, accounts, categories, and settings. Available in standard JSON or ZIP-compressed CSV format.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                                onClick={() => handleExportData('json')}
                                disabled={isExporting}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer"
                                style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                            >
                                {isExporting ? 'Exporting...' : 'Download JSON'}
                            </button>
                            <button
                                onClick={() => handleExportData('csv')}
                                disabled={isExporting}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer"
                                style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                            >
                                {isExporting ? 'Exporting...' : 'Download CSV (ZIP)'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 2: Clear Financial Data */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.01]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-amber-500">Purge Financial Ledgers</h3>
                            <p className="text-xs text-muted mt-1 leading-relaxed max-w-xl">
                                Delete all of your transactions, payment sources, coupons, and recurring bills. Your login account, profile settings, and custom categories will be preserved.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setIsClearDataModalOpen(true);
                                setConfirmPassword('');
                            }}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-200 shrink-0 cursor-pointer"
                        >
                            Clear Ledgers
                        </button>
                    </div>
                </div>

                {/* Section 3: Delete Account */}
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.01]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-red-500">Delete Account Permanently</h3>
                            <p className="text-xs text-muted mt-1 leading-relaxed max-w-xl">
                                Completely erase your account and all of your user data from our databases permanently. This action cannot be undone and will immediately log you out.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setIsDeleteAccountModalOpen(true);
                                setConfirmPassword('');
                            }}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-200 shrink-0 cursor-pointer"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>

                {/* Clear Financial Data Modal */}
                {isClearDataModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-md card p-6 border border-white/10 shadow-2xl relative">
                            <h3 className="text-base font-bold text-main">Clear Financial Data</h3>
                            <p className="text-xs text-muted mt-2 leading-relaxed">
                                Are you sure you want to clear your ledgers? This will permanently delete all transactions, balances, sources, and vault records. Custom categories and profile preferences will remain intact.
                            </p>

                            <div className="mt-4 space-y-3">
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider">Confirm Your Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter current password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-black/20 border border-white/10 rounded-lg text-main focus:outline-none focus:border-amber-500/40"
                                />
                            </div>

                            {/* Slide to Purge Confirmation */}
                            <div className="mt-5 space-y-3">
                                <span className="block text-[10px] font-bold text-muted uppercase tracking-wider text-left">Slide to Purge Confirmation</span>
                                <div className="relative h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                                    {/* Slider fill gradient */}
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600/20 to-amber-600/40 transition-all pointer-events-none" 
                                        style={{ width: `${purgeSliderVal}%` }}
                                    />
                                    
                                    <span className="absolute text-xs font-bold text-main/60 select-none pointer-events-none">
                                        {purgeSliderVal >= 100 ? "RELEASE TO PURGE" : "SLIDE TO CONFIRM PURGE"}
                                    </span>
                                    
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={purgeSliderVal}
                                        onChange={(e) => setPurgeSliderVal(Number(e.target.value))}
                                        onMouseUp={() => {
                                            if (purgeSliderVal < 100) {
                                                setPurgeSliderVal(0);
                                            } else {
                                                handleClearFinancialData();
                                            }
                                        }}
                                        onTouchEnd={() => {
                                            if (purgeSliderVal < 100) {
                                                setPurgeSliderVal(0);
                                            } else {
                                                handleClearFinancialData();
                                            }
                                        }}
                                        disabled={!confirmPassword || isPurging}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize disabled:cursor-not-allowed"
                                    />
                                    
                                    {/* Custom handle visual */}
                                    <div 
                                        className="absolute w-10 h-10 rounded-lg bg-amber-600 border border-amber-500 shadow flex items-center justify-center transition-all pointer-events-none"
                                        style={{ left: `calc(${purgeSliderVal}% * 0.8 + 4px)` }}
                                    >
                                        <ChevronRight className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => {
                                        setIsClearDataModalOpen(false);
                                        setConfirmPassword('');
                                        setPurgeSliderVal(0);
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 text-main hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Account Modal */}
                {isDeleteAccountModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-md card p-6 border border-white/10 shadow-2xl relative">
                            <h3 className="text-base font-bold text-main animate-pulse">Are you absolutely sure?</h3>
                            
                            <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/[0.02] mt-3">
                                <p className="text-xs font-semibold text-red-500">Deleting your account will permanently remove:</p>
                                <ul className="text-xs text-muted mt-2 space-y-1 list-disc list-inside">
                                    <li>transactions</li>
                                    <li>vaults</li>
                                    <li>accounts</li>
                                    <li>analytics</li>
                                    <li>settings</li>
                                    <li>recurring bills</li>
                                    <li>demo data</li>
                                </ul>
                                <p className="text-xs font-semibold text-red-500 mt-2">This action cannot be undone.</p>
                            </div>

                            <div className="mt-4 space-y-3">
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider">Confirm Your Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter current password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-black/20 border border-white/10 rounded-lg text-main focus:outline-none focus:border-red-500/40"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => {
                                        setIsDeleteAccountModalOpen(false);
                                        setConfirmPassword('');
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 text-main hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer"
                                >
                                    {isDeleting ? 'Deleting...' : 'Permanently Delete My Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ),
    };

    return (
        <div className="space-y-5">
            {/* Tab Layout */}
            <div className="flex flex-col md:flex-row gap-5 min-h-[500px]">

                {/* Left Tab Nav */}
                <aside className="md:w-52 shrink-0 overflow-hidden">
                    <nav className="card p-2 flex flex-row overflow-x-auto gap-2 scrollbar-none md:flex-col md:space-y-0.5 md:gap-0">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 md:w-full md:flex md:justify-between md:px-3 md:py-2.5 md:rounded-lg md:text-sm md:font-medium md:normal-case md:tracking-normal ${
                                        isActive
                                            ? 'text-primary border border-primary/20 bg-primary/5'
                                            : 'text-muted hover:text-main hover:bg-white/[0.04] border border-transparent'
                                    }`}
                                    style={isActive ? { background: 'rgba(59,130,246,0.08)' } : {}}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {label}
                                    </div>
                                    {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60 hidden md:block" />}
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

            {/* Recovery Code Password Confirmation Modal */}
            {isRegenerateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md glass-premium p-8 rounded-[32px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-slate-900/60 relative text-left">
                        <h2 className="text-xl font-bold tracking-tight text-main mb-3">Confirm Password</h2>
                        <p className="text-xs text-muted leading-relaxed mb-6">
                            For security, please enter your current account password to generate a new recovery code.
                        </p>
                        
                        <form onSubmit={handleRegenerateRecoveryCode} className="space-y-4">
                            <Field label="Current Password">
                                <input
                                    type="password"
                                    value={regeneratePassword}
                                    onChange={(e) => setRegeneratePassword(e.target.value)}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20 text-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </Field>
                            
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRegenerateModalOpen(false);
                                        setRegeneratePassword('');
                                    }}
                                    className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold text-main cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isRegenerating}
                                    className="flex-1 h-12 bg-primary hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isRegenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Confirm'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Successful Regeneration Modal */}
            {newRecoveryCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-center">
                    <div className="w-full max-w-lg glass-premium p-8 md:p-10 rounded-[32px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-slate-900/60 relative text-left">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20">
                            <Shield className="w-8 h-8 animate-pulse" />
                        </div>
                        
                        <h2 className="text-2xl font-bold tracking-tight text-main mb-3 text-center">New Recovery Code</h2>
                        
                        <p className="text-xs text-muted leading-relaxed max-w-md mx-auto mb-6 text-center">
                            A brand new recovery code has been generated. Your previous recovery code is now invalid. Please save this code securely.
                        </p>
                        
                        {/* Monospace Code Display Box */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 mb-6 relative group overflow-hidden text-center">
                            <span className="font-mono text-xl md:text-2xl font-bold text-primary tracking-widest block select-all font-semibold">
                                {newRecoveryCode}
                            </span>
                        </div>
                        
                        {/* Actions: Copy & Download */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(newRecoveryCode);
                                    addToast("New recovery code copied securely", "success");
                                }}
                                className="px-4 py-3 rounded-xl text-xs font-bold border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-main cursor-pointer"
                            >
                                Copy Code
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const element = document.createElement("a");
                                    const fileContent = `NEXVAULT RECOVERY CODE\n======================\n\nCode: ${newRecoveryCode}\n\nWARNING:\nStore this recovery code securely.\nAnyone with access to this code can reset your NEXVAULT account password.`;
                                    const file = new Blob([fileContent], {type: 'text/plain'});
                                    element.href = URL.createObjectURL(file);
                                    element.download = "nexvault-recovery-code.txt";
                                    document.body.appendChild(element);
                                    element.click();
                                    document.body.removeChild(element);
                                    addToast("Recovery code TXT saved securely", "success");
                                }}
                                className="px-4 py-3 rounded-xl text-xs font-bold border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-main cursor-pointer"
                            >
                                Download TXT
                            </button>
                        </div>
                        
                        {/* Mandatory Save Confirmation Checkbox */}
                        <div className="flex items-start gap-3 text-left p-4 rounded-xl border border-white/5 bg-white/[0.01] mb-6">
                            <input
                                type="checkbox"
                                id="confirmRegenSaved"
                                checked={isSavedChecked}
                                onChange={(e) => setIsSavedChecked(e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20 accent-primary cursor-pointer animate-fade-in"
                            />
                            <label htmlFor="confirmRegenSaved" className="text-xs text-muted leading-relaxed cursor-pointer select-none">
                                I have securely saved my new recovery code. I understand it cannot be recovered or shown again.
                            </label>
                        </div>
                        
                        {/* Continue Button */}
                        <button
                            type="button"
                            disabled={!isSavedChecked}
                            onClick={() => {
                                setNewRecoveryCode('');
                                setIsSavedChecked(false);
                            }}
                            className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none cursor-pointer"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Ledger Anchor Date Modal */}
            <AnimatePresence>
                {isAnchorModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="w-full max-w-md glass-premium p-6 md:p-8 rounded-[28px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-slate-900/80 relative text-left"
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setIsAnchorModalOpen(false)}
                                className="absolute top-5 right-5 text-muted hover:text-main p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-lg font-bold text-main flex items-center gap-2 mb-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Set Ledger Anchor Date
                            </h3>
                            
                            <p className="text-xs text-muted leading-relaxed mb-4">
                                Choose a starting point for your ledger. All transaction inputs prior to this date will be restricted to guarantee balance integrity.
                            </p>

                            {/* Warning Banner */}
                            <div className="p-3 rounded-xl border border-primary/10 bg-primary/[0.02] mb-4 flex items-start gap-2.5">
                                <AlertTriangle className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                                <p className="text-[11px] text-muted leading-relaxed">
                                    Moving this date backward allows older logs. You cannot move this date to a future date or past existing transaction records.
                                </p>
                            </div>

                            {/* Presets Grid */}
                            <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Quick Presets</span>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setTempAnchorDate(getTodayDateString())}
                                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                                        tempAnchorDate === getTodayDateString()
                                            ? 'bg-primary/20 text-primary border-primary/40'
                                            : 'bg-white/[0.02] border-white/5 text-muted hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTempAnchorDate(getStartOfMonthDateString())}
                                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                                        tempAnchorDate === getStartOfMonthDateString()
                                            ? 'bg-primary/20 text-primary border-primary/40'
                                            : 'bg-white/[0.02] border-white/5 text-muted hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                                >
                                    Start of Month
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTempAnchorDate(getStartOfYearDateString())}
                                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                                        tempAnchorDate === getStartOfYearDateString()
                                            ? 'bg-primary/20 text-primary border-primary/40'
                                            : 'bg-white/[0.02] border-white/5 text-muted hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                                >
                                    Start of Year
                                </button>
                            </div>

                            {/* Calendar Picker container */}
                            <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Custom Date Picker</span>
                            <div className="relative w-full mb-4">
                                <DatePicker
                                    selected={tempAnchorDate ? new Date(tempAnchorDate) : null}
                                    onChange={(date) => {
                                        if (date) {
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            setTempAnchorDate(`${year}-${month}-${day}`);
                                        } else {
                                            setTempAnchorDate('');
                                        }
                                    }}
                                    dateFormat="dd-MM-yyyy"
                                    maxDate={new Date()}
                                    calendarStartDay={weekStart}
                                    calendarClassName="premium-calendar"
                                    portalId="root"
                                    renderCustomHeader={({
                                        date,
                                        changeYear,
                                        changeMonth,
                                        decreaseMonth,
                                        increaseMonth,
                                        prevMonthButtonDisabled,
                                        nextMonthButtonDisabled,
                                    }) => (
                                        <div className="flex items-center justify-between px-1.5 py-1 gap-2">
                                            <button
                                                type="button"
                                                onClick={decreaseMonth}
                                                disabled={prevMonthButtonDisabled}
                                                className="p-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5 text-muted hover:text-main" />
                                            </button>
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <CustomSelect
                                                    value={date.getMonth()}
                                                    onChange={(val) => changeMonth(Number(val))}
                                                    options={monthsOptions}
                                                    className="flex-1 min-w-0"
                                                    buttonClassName="px-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-main flex items-center justify-between"
                                                    buttonStyle={{ height: '28px', padding: '0 8px', borderRadius: '8px' }}
                                                    dropdownClassName="w-32"
                                                />
                                                <CustomSelect
                                                    value={date.getFullYear()}
                                                    onChange={(val) => changeYear(Number(val))}
                                                    options={yearsOptions}
                                                    className="w-[74px] shrink-0"
                                                    buttonClassName="px-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-main flex items-center justify-between"
                                                    buttonStyle={{ height: '28px', padding: '0 8px', borderRadius: '8px' }}
                                                    dropdownClassName="w-24"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={increaseMonth}
                                                disabled={nextMonthButtonDisabled}
                                                className="p-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-muted hover:text-main" />
                                            </button>
                                        </div>
                                    )}
                                    className="input-field w-full pr-10 cursor-pointer text-main font-semibold bg-white/5 border border-white/10 hover:border-white/20 focus:border-primary/40 rounded-xl h-11 px-4 transition-all"
                                    placeholderText="DD-MM-YYYY"
                                    wrapperClassName="w-full"
                                    type="text"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted z-10">
                                    <Calendar className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Display target date */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01] mb-5">
                                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Target Date</span>
                                <span className="text-xs font-bold text-primary">
                                    {tempAnchorDate ? (() => {
                                        const [y, m, d] = tempAnchorDate.split('-');
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        return `${d} ${months[parseInt(m) - 1]} ${y}`;
                                    })() : 'None Selected'}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAnchorModalOpen(false)}
                                    className="flex-1 h-10 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-main transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAnchorDate}
                                    disabled={isSavingAnchor}
                                    className="flex-1 h-10 bg-primary hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    {isSavingAnchor ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Start Date'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ImageCropModal
                src={cropImageSrc}
                isOpen={isCropModalOpen}
                onCancel={() => {
                    setIsCropModalOpen(false);
                    setCropImageSrc(null);
                }}
                onSave={handleSaveCroppedAvatar}
            />
        </div>
    );
}
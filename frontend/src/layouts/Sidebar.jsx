import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, Tag, Settings, X, LogOut, BarChart2, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BRANDING } from '../config/branding';
import Logo from '../components/Logo';

const navItems = [
  { name: 'Dashboard',    path: '/',            icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Accounts',     path: '/accounts',    icon: Wallet },
  { name: 'Credit Pools', path: '/credit-pools',icon: Building2 },
  { name: 'Coupon Vault', path: '/vault',        icon: Tag },
  { name: 'Analytics',   path: '/analytics',   icon: BarChart2 },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning';
    if (hr >= 12 && hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const [localAvatar, setLocalAvatar] = useState(() => {
    if (user) {
      return localStorage.getItem(`${BRANDING.STORAGE_PREFIX}_local_avatar_${user.id}`);
    }
    return null;
  });

  useEffect(() => {
    const getScopedAvatar = () => {
      if (user) {
        return localStorage.getItem(`${BRANDING.STORAGE_PREFIX}_local_avatar_${user.id}`);
      }
      return null;
    };

    setLocalAvatar(getScopedAvatar());

    const handleAvatarUpdate = () => setLocalAvatar(getScopedAvatar());
    window.addEventListener(BRANDING.AVATAR_UPDATE_EVENT, handleAvatarUpdate);
    return () => window.removeEventListener(BRANDING.AVATAR_UPDATE_EVENT, handleAvatarUpdate);
  }, [user]);

  const displayAvatar = localAvatar || user?.avatar_url;

  const getInitials = (name) => {
    if (!name) return 'V';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const displayLabel  = user?.display_name || user?.full_name || user?.email || 'Account';
  const avatarInitials = getInitials(user?.display_name || user?.full_name || user?.email);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
        <Logo showText textClass="text-xl" color="var(--primary)" />
        {/* Close button — mobile only */}
        <button
          onClick={onMobileClose}
          className="md:hidden text-muted hover:text-main transition-colors p-1 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 relative select-none">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div key={item.name} className="relative flex items-center">
              {/* Glowing Neon Active Left Indicator */}
              {isActive && (
                <div className="absolute left-[-16px] w-1.5 h-6 rounded-r-full bg-primary shadow-[0_0_15px_#3b82f6] animate-fade-in" />
              )}
              
              <Link
                to={item.path}
                onClick={onMobileClose}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-semibold w-full group ${
                  isActive
                    ? 'bg-primary/[0.08] text-primary border border-primary/20 shadow-[0_4px_20px_rgba(59,130,246,0.06)]'
                    : 'text-muted hover:bg-white/[0.03] hover:text-main hover:translate-x-1.5 border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-all duration-300 group-hover:scale-105 ${isActive ? 'text-primary' : 'text-muted group-hover:text-main'}`} />
                <span>{item.name}</span>
              </Link>
            </div>
          );
        })}

        {/* Command Palette Keyboard Hint */}
        <div className="px-4 py-2 select-none mx-2 mb-2">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-muted hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
              <span>Quick Finder</span>
            </div>
            <kbd className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-[9px] font-mono tracking-wider text-main shadow-inner select-none font-bold">
              Ctrl + K
            </kbd>
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-4 space-y-1 border-t border-white/5 shrink-0">

        {/* Profile Card */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 border border-white/5 shadow-[0_4px_15px_rgba(0,0,0,0.15)] relative overflow-hidden bg-slate-900/40"
        >
          {/* Avatar Container with Active Pulsing Ring */}
          <div className="relative shrink-0 select-none">
            <div 
              className="w-9 h-9 rounded-full border border-white/10 overflow-hidden flex items-center justify-center text-main"
              style={{
                background: displayAvatar ? 'transparent' : 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              }}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold tracking-wider">{avatarInitials}</span>
              )}
            </div>
            
            {/* Securesync Pulse Indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_#34d399] animate-pulse" title="Synchronized Secure Session" />
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-primary font-bold uppercase tracking-wider leading-none mb-0.5 select-none">{greeting} 👋</p>
            <p className="text-xs font-extrabold text-main truncate leading-normal">{displayLabel}</p>
            {user?.email && user?.display_name && (
              <p className="text-[9px] text-muted truncate leading-relaxed opacity-75">{user.email}</p>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        <Link
          to="/settings"
          onClick={onMobileClose}
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            location.pathname === '/settings'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:bg-white/5 hover:text-main border border-transparent'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="w-64 border-r border-white/10 hidden md:flex flex-col shrink-0 glass-premium bg-slate-950/65 backdrop-blur-xl relative z-10"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col md:hidden transition-transform duration-300 glass-premium bg-slate-950/80 backdrop-blur-2xl shadow-[5px_0_30px_rgba(0,0,0,0.5)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

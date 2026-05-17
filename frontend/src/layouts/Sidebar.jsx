import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, Tag, Settings, X, LogOut, BarChart2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BRANDING } from '../config/branding';
import Logo from '../components/Logo';

const navItems = [
  { name: 'Dashboard',    path: '/',            icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Accounts',     path: '/accounts',    icon: Wallet },
  { name: 'Coupon Vault', path: '/vault',        icon: Tag },
  { name: 'Analytics',   path: '/analytics',   icon: BarChart2 },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();

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
      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onMobileClose}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted hover:bg-white/5 hover:text-main border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-muted'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 space-y-1 border-t border-white/5 shrink-0">

        {/* Profile Card */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {/* Avatar */}
          <div 
            className="w-8 h-8 rounded-full border border-white/10 overflow-hidden flex items-center justify-center text-main shrink-0"
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

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-main truncate">{displayLabel}</p>
            {user?.email && user?.display_name && (
              <p className="text-[10px] text-muted truncate">{user.email}</p>
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
        className="w-64 border-r border-white/5 hidden md:flex flex-col shrink-0"
        style={{ background: 'var(--surface)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col md:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--surface)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Wallet, Tag, Settings, BarChart2,
  Plus, Search, ArrowRight, Zap, Copy, RefreshCw, X,
} from 'lucide-react';
import { BRANDING } from '../config/branding';


// ─── Static navigation + action items ─────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'nav-dashboard',    label: 'Dashboard',       icon: LayoutDashboard, group: 'Navigation', path: '/' },
  { id: 'nav-transactions', label: 'Transactions',    icon: Receipt,         group: 'Navigation', path: '/transactions' },
  { id: 'nav-accounts',     label: 'Accounts',        icon: Wallet,          group: 'Navigation', path: '/accounts' },
  { id: 'nav-vault',        label: 'Coupon Vault',    icon: Tag,             group: 'Navigation', path: '/vault' },
  { id: 'nav-analytics',    label: 'Analytics',       icon: BarChart2,       group: 'Navigation', path: '/analytics' },
  { id: 'nav-settings',     label: 'Settings',        icon: Settings,        group: 'Navigation', path: '/settings' },
];

const ACTION_ITEMS = (onAction) => [
  {
    id: 'act-add-transaction',
    label: 'Add Transaction',
    description: 'Record a new expense or income',
    icon: Plus,
    group: 'Actions',
    run: () => onAction('add-transaction'),
  },
  {
    id: 'act-add-account',
    label: 'Add Account',
    description: 'Create a new bank or card account',
    icon: Plus,
    group: 'Actions',
    run: () => onAction('add-account'),
  },
  {
    id: 'act-add-coupon',
    label: 'Add Coupon',
    description: 'Save a new discount code to Vault',
    icon: Tag,
    group: 'Actions',
    run: () => onAction('add-coupon'),
  },
];

function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase();
  return text.toLowerCase().includes(q);
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const g = item[key];
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});
}

// ─── Command Palette ──────────────────────────────────────────────────────────
export default function CommandPalette({ onAction }) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [cursor, setCursor]       = useState(0);
  const inputRef                  = useRef(null);
  const listRef                   = useRef(null);
  const navigate                  = useNavigate();

  // Build flat result list
  const actions = ACTION_ITEMS(onAction);
  const allItems = [...NAV_ITEMS, ...actions];
  const results = allItems.filter(item =>
    fuzzyMatch(query, item.label) ||
    fuzzyMatch(query, item.description || '') ||
    fuzzyMatch(query, item.group)
  );
  const grouped = groupBy(results, 'group');

  // Flatten for keyboard cursor
  const flat = Object.values(grouped).flat();

  // Open / close
  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setCursor(0);
  }, []);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open ? closePalette() : openPalette();
      }
      if (e.key === 'Escape' && open) closePalette();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, openPalette, closePalette]);

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(c => Math.min(c + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(c => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flat[cursor];
        if (item) executeItem(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, cursor]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  // Reset cursor on query change
  useEffect(() => setCursor(0), [query]);

  function executeItem(item) {
    closePalette();
    if (item.path) {
      navigate(item.path);
    } else if (item.run) {
      item.run();
    }
  }

  if (!open) return null;

  const groupOrder = ['Navigation', 'Actions'];
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => groupOrder.indexOf(a) - groupOrder.indexOf(b)
  );

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closePalette(); }}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          animation: 'cmdSlideDown 0.18s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, actions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-main text-sm font-medium placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted hover:text-main transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted px-1.5 py-0.5 rounded-md border shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '380px' }}>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <Search className="w-8 h-8 opacity-20 mb-3" />
              <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            sortedGroups.map(([group, items]) => (
              <div key={group} className="py-1.5">
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted opacity-70">
                  {group}
                </p>
                {items.map((item) => {
                  const isActive = globalIdx === cursor;
                  const idx = globalIdx++;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => executeItem(item)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: isActive ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-main truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted truncate">{item.description}</p>
                        )}
                      </div>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t text-[11px] text-muted"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="flex items-center gap-1.5"><kbd className="kbd-hint">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd-hint">↵</kbd> select</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd-hint">Esc</kbd> close</span>
          <span className="ml-auto flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-primary font-medium">{BRANDING.NAME}</span>

          </span>
        </div>
      </div>
    </div>
  );
}

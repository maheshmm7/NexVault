import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Search, BookOpen, HelpCircle, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

export default function SupportMobileDrawer({
  isOpen,
  onClose,
  activePage,
  docSections,
  activeSection,
  setActiveSection,
  searchQuery,
  setSearchQuery
}) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Body scroll locking and focus restoration
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement;
      
      // Lock scroll
      document.body.style.overflow = 'hidden';
      
      // Focus the close button or first element in drawer
      setTimeout(() => {
        const focusable = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);
    } else {
      // Restore scroll
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Key handlers (Escape & Tab trap)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            lastEl.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastEl) {
            firstEl.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md lg:hidden flex justify-start"
      onClick={onClose}
    >
      <motion.div 
        ref={drawerRef}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
        className="w-80 max-w-[85vw] h-full bg-[#0b0f19] border-r border-white/5 p-6 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <Logo size={24} showText={true} textClass="text-lg text-white" />
          <button 
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all focus:ring-1 focus:ring-blue-500/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If docSections are provided, show Docs Search and Sections list */}
        {docSections ? (
          <>
            {/* Mobile Search Input */}
            <div className="relative group">
              <Search className="absolute left-4 top-[11px] w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search documentation..." 
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2.5 pl-11 pr-10 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-[10px] p-1 text-slate-500 hover:text-white rounded-md hover:bg-white/5 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {docSections.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 px-2">
                    {group.group}
                  </h5>
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => {
                              setActiveSection(item.id);
                              onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
                              isActive 
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
              <Link 
                to="/help" 
                onClick={onClose}
                className={`text-xs font-bold uppercase tracking-wider py-1 ${activePage === 'help' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
              >
                Help Center
              </Link>
              <Link 
                to="/trust" 
                onClick={onClose}
                className={`text-xs font-bold uppercase tracking-wider py-1 ${activePage === 'trust' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
              >
                Trust Center
              </Link>
              <Link 
                to="/status" 
                onClick={onClose}
                className={`text-xs font-bold uppercase tracking-wider py-1 flex items-center gap-2 ${activePage === 'status' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Status
              </Link>
            </div>
          </>
        ) : (
          /* General Support Links for Help, Trust, and Status Pages */
          <div className="flex-1 flex flex-col gap-2 pt-4">
            <Link 
              to="/docs" 
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activePage === 'docs' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Docs
            </Link>
            <Link 
              to="/help" 
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activePage === 'help' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Help Center
            </Link>
            <Link 
              to="/trust" 
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activePage === 'trust' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Trust Center
            </Link>
            <Link 
              to="/status" 
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activePage === 'status' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Status</span>
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

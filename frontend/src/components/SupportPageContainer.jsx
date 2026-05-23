import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Menu, X } from 'lucide-react';
import Logo from './Logo';
import SupportMobileDrawer from './SupportMobileDrawer';

export default function SupportPageContainer({
  children,
  activePage,
  pageTitle,
  docSections,
  activeSection,
  setActiveSection,
  searchQuery,
  setSearchQuery
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine radial glow color based on the current page context
  const isEmeraldTheme = activePage === 'trust' || activePage === 'status';
  const radialGlowClass = isEmeraldTheme
    ? 'bg-radial-gradient(circle at 50% -20%, rgba(16, 185, 129, 0.18) 0%, transparent 70%)'
    : 'bg-radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.18) 0%, transparent 70%)';

  const leftAmbiClass = isEmeraldTheme
    ? 'bg-emerald-500/5'
    : 'bg-blue-500/5';

  const rightAmbiClass = isEmeraldTheme
    ? 'bg-teal-500/5'
    : 'bg-indigo-500/5';

  return (
    <div className="bg-[#0b0f19] text-slate-100 min-h-screen font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden relative">
      {/* Background cinematic grid and radial gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cinematic-grid opacity-[0.15]" />
        <div 
          className="absolute inset-0 transition-all duration-500" 
          style={{ backgroundImage: radialGlowClass }} 
        />
        <div className={`absolute top-1/4 left-1/4 w-[400px] h-[400px] blur-[120px] rounded-full transition-colors duration-500 ${leftAmbiClass}`} />
        <div className={`absolute bottom-1/3 right-1/4 w-[400px] h-[400px] blur-[120px] rounded-full transition-colors duration-500 ${rightAmbiClass}`} />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:opacity-95 transition-opacity">
              <Logo size={28} showText={true} textClass="text-xl text-white" />
            </Link>
            <span className="hidden md:inline-block w-px h-5 bg-slate-800" />
            <span className="hidden md:inline-block text-xs font-bold uppercase tracking-[0.25em] text-slate-400 select-none">
              {pageTitle}
            </span>
          </div>

          {/* Quick Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link 
              to="/docs" 
              className={`transition-colors py-1 ${activePage === 'docs' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
            >
              Docs
            </Link>
            <Link 
              to="/help" 
              className={`transition-colors py-1 ${activePage === 'help' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
            >
              Help Center
            </Link>
            <Link 
              to="/trust" 
              className={`transition-colors py-1 ${activePage === 'trust' ? 'text-white border-b-2 border-emerald-500' : 'hover:text-white'}`}
            >
              Trust Center
            </Link>
            <Link 
              to="/status" 
              className={`transition-colors py-1 flex items-center gap-2 ${activePage === 'status' ? 'text-white border-b-2 border-emerald-500' : 'hover:text-white'}`}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Status</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-xl border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            {/* Mobile menu trigger button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all focus:ring-1 focus:ring-blue-500/50"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Layout Wrapper */}
      <div className="relative z-10 w-full">
        {children}
      </div>

      {/* Shared Accessible Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <SupportMobileDrawer
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            activePage={activePage}
            docSections={docSections}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

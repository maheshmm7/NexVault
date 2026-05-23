import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  HelpCircle, 
  ShieldCheck, 
  Activity, 
  Search, 
  Menu, 
  X, 
  ArrowLeft, 
  ChevronRight, 
  Clock, 
  Layers, 
  DollarSign, 
  Lock, 
  RefreshCw, 
  Users,
  AlertTriangle
} from 'lucide-react';
import SupportPageContainer from '../components/SupportPageContainer';

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const contentRef = useRef(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      window.scrollTo(0, 0);
      isFirstMount.current = false;
    } else if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const yOffset = -90; 
      const y = rect.top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [activeSection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isInteractive = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.isContentEditable;
      if (isInteractive) {
        if (e.key === 'Escape' && target === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const highlightText = (text, search) => {
    if (!search || !search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) 
        ? <span key={i} className="text-blue-400 font-extrabold bg-blue-500/10 px-1 rounded">{part}</span> 
        : part
    );
  };

  const docSections = [
    {
      group: 'Product Guides',
      items: [
        { id: 'getting-started', title: 'Getting Started', icon: BookOpen },
        { id: 'accounts-dash', title: 'Accounts & Dashboard', icon: Layers },
        { id: 'shared-pools', title: 'Shared Credit Pools', icon: Users },
      ]
    },
    {
      group: 'Financial Logic & Analytics',
      items: [
        { id: 'repayments', title: 'Repayments & Analytics', icon: DollarSign },
        { id: 'ledger-validation', title: 'Historical Ledger Validation', icon: RefreshCw },
      ]
    },
    {
      group: 'Security & Trust',
      items: [
        { id: 'vault-security', title: 'Secure Vault (AES-256-GCM)', icon: Lock },
        { id: 'trust-privacy', title: 'Data Trust & Privacy', icon: ShieldCheck },
      ]
    },
    {
      group: 'Support',
      items: [
        { id: 'faqs', title: 'FAQs & Troubleshooting', icon: HelpCircle },
      ]
    }
  ];

  const searchableDocs = [
    {
      id: 'getting-started',
      title: 'Getting Started with NexVault',
      category: 'Product Guides',
      icon: BookOpen,
      excerpt: 'Welcome to NexVault, a next-generation platform engineered to bring institutional-grade security, asset protection, and pooled financial control...',
      content: 'Welcome to NexVault, a next-generation platform engineered to bring institutional-grade security, asset protection, and pooled financial control directly to your browser. Core Concepts: NexVault coordinates shared spending structures, manages localized ledger integrity, and protects passwords and vault secrets through a unified interface. Before starting, configure your vault and establish a transaction ledger account. Onboarding steps: Create Account (Register with a secure password and configure your credentials), Initialize Ledger (Establish your primary account structure to validate historical transactions), Secure Vault (Unlock your cryptographically shielded storage to protect digital assets).'
    },
    {
      id: 'accounts-dash',
      title: 'Accounts & Dashboard Guides',
      category: 'Product Guides',
      icon: Layers,
      excerpt: 'The dashboard functions as a centralized command center, coordinating accounts, limits, pooled spending, and digital vaults...',
      content: 'The dashboard functions as a centralized command center, coordinating accounts, limits, pooled spending, and digital vaults. Every user is allocated a primary account that can hold individual assets or link directly to shared pools. The dashboard calculates real-time limits, active ledger states, and recent activity. Balances include: Available Limit (remaining credit or liquidity authorized), Ledger Balance (sum of all validated transactions calculated chronologically), and Pending Pool Liabilities (outlays incurred within credit pools).'
    },
    {
      id: 'shared-pools',
      title: 'Shared Credit Pools Allocation',
      category: 'Product Guides',
      icon: Users,
      excerpt: 'Shared credit pools enable multiple users to coordinate and spend from a single, unified allocation with predefined parameters...',
      content: 'Shared credit pools enable multiple users to coordinate and spend from a single, unified allocation with predefined parameters and joint accountability. How Shared Pool Limits Work: Maximum ceiling for the shared pool. Available Limit = Min(Individual Allocation, Pool Ceiling - Active Outlays). Double-gate limits ensure that an individual user can never exceed their explicit limit. Joint Accountability Principles: All transactions made against the pool are logged publicly inside the ledger. Repayments restore the pool ceiling instantly, clearing liabilities for all members.'
    },
    {
      id: 'repayments',
      title: 'Repayments & Spending Analytics Exclusion',
      category: 'Financial Logic & Analytics',
      icon: DollarSign,
      excerpt: 'To maintain fiscal accuracy, NexVault differentiates between standard expense transactions and capital repayments...',
      content: 'To maintain fiscal accuracy, NexVault differentiates between standard expense transactions and capital repayments. Spending Analytics Exclusion: Repayments are strictly excluded from spending analytics charts and insights to prevent double-counting. An outflow is an expense. Repayment of pool debt balances a debt rather than acquiring a new product/service, so it acts as a ledger adjustment. Initiating a repayment clears active liabilities and restores pool limits.'
    },
    {
      id: 'ledger-validation',
      title: 'Historical Ledger Validation & Audits',
      category: 'Financial Logic & Analytics',
      icon: RefreshCw,
      excerpt: 'Historical ledger validation is the integrity layer of NexVault, ensuring that transactions remain consistent, untampered, and chronological...',
      content: 'Historical ledger validation is the integrity layer of NexVault, ensuring that transactions remain consistent, untampered, and chronological. Timeline consistency enforcement and historical balance integrity validation. Verification checks: Chronological Verification (re-calculating impact of every debit and credit transaction), Mathematical Integrity Checks (verifying account total did not fall below zero or authorized overdraft), Timeline Consistency (all transactions strictly ordered). Validation warnings and synchronization failures happen because of Balance Underflow or Timeline Drift.'
    },
    {
      id: 'vault-security',
      title: 'Secure Vault (AES-256-GCM) Cryptography',
      category: 'Security & Trust',
      icon: Lock,
      excerpt: 'Sensitive data such as digital coupons, recovery credentials, and security keys are protected via AES-256-GCM authenticated encryption...',
      content: 'Sensitive data such as digital coupons, recovery credentials, and security keys are protected via AES-256-GCM authenticated encryption. Architectural Shielding: Vault data is encrypted at rest using AES-256-GCM. Key Security Measures: Randomized Nonces (IVs) of 12-byte secure initialization vector, transparent ORM integration inside server memory during authorized requests.'
    },
    {
      id: 'trust-privacy',
      title: 'Data Trust & Privacy Commitments',
      category: 'Security & Trust',
      icon: ShieldCheck,
      excerpt: 'NexVault implements strict guidelines to ensure that user data and operational integrity remain secure...',
      content: 'NexVault implements strict guidelines to ensure that user data and operational integrity remain secure. Commitments: Secure Session Management (automated token revocations, HttpOnly cookies, localized CSRF validations), Technical Accuracy & Disclosure (encrypted-at-rest structures audited through access controls instead of misleading end-to-end terms).'
    },
    {
      id: 'faqs',
      title: 'FAQs & Troubleshooting Guidelines',
      category: 'Support',
      icon: HelpCircle,
      excerpt: 'Find fast answers for common questions regarding limits, sync warnings, and vault recovery...',
      content: 'Find fast answers for common questions regarding limits, sync warnings, and vault recovery. Q: Why did my validation audit generate a balance synchronization warning? A: A sync warning indicates that the system discovered a timeline drift or an out-of-order transaction. Running a manual balance re-synchronization from the Help Center corrects the timeline propagation. Q: Why are payments in shared credit pools creating multiple ledger entries? A: To ensure transparent double-entry accounting, a pool repayment triggers individual ledger updates for both the pool status itself and the individual contributor record.'
    }
  ];

  const filteredDocs = searchableDocs.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allItems = docSections.flatMap(g => g.items);
  const activeItem = allItems.find(item => item.id === activeSection) || allItems[0];

  return (
    <SupportPageContainer
      activePage="docs"
      pageTitle="Documentation Center"
      docSections={docSections}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >

      {/* Hero Banner Section */}
      <section className="relative z-10 py-20 px-6 max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-premium border border-white/10 mb-2"
        >
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">
            System Knowledge Hub
          </span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight"
        >
          NexVault Documentation <br />
          <span className="animate-shimmer-text text-cinematic-gradient">Ecosystem & Logic</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm md:text-base text-slate-400 max-w-xl mx-auto font-medium leading-relaxed"
        >
          Explore comprehensive guides detailing AES-256-GCM vault security, historical ledger audit verification, shared pool allocation mathematics, and repayment analytics.
        </motion.p>

        {/* Central Premium Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-xl mx-auto relative mt-8 group"
        >
          <Search className="absolute left-4 top-[17px] w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search documentation (press '/' to focus)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-4 pl-11 pr-16 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] glass-premium"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-12 top-[15px] p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd 
            onClick={() => searchInputRef.current?.focus()}
            className="absolute right-4 top-[15px] kbd-hint hidden sm:inline-flex text-[10px] font-mono select-none cursor-pointer hover:bg-white/10"
          >
            /
          </kbd>
        </motion.div>
      </section>

      {/* Main Content Layout */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-6 pb-20 relative z-10 flex gap-8">
        
        {/* Sticky Desktop Left Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 h-[calc(100vh-140px)] sticky top-28 overflow-y-auto pr-4 scrollbar-thin">
          <div className="space-y-8">
            {docSections.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-3">
                  {group.group}
                </h4>
                <ul className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all group ${
                            isActive 
                              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:scale-110'}`} />
                          <span className="truncate">{item.title}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-400" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 max-w-3xl overflow-hidden min-h-[500px]">
          
          {/* Breadcrumb & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              <span>Docs</span>
              <ChevronRight className="w-3 h-3 text-slate-650" />
              <span className="text-slate-350">{activeItem.title}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Last Updated: May 2026</span>
            </div>
          </div>

          {/* Dynamic Search Results vs Active Article */}
          {searchQuery.trim().length > 0 ? (
            <div className="space-y-6 animate-fade-in max-w-3xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Search Results for "{searchQuery}"
                </h3>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              </div>

              {filteredDocs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 glass-premium border border-white/5 rounded-3xl p-8 space-y-4 shadow-xl"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-slate-500 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-350 text-sm">No documentation articles found</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Try adjusting your keywords (e.g. searching for "vault", "ledger", "limit", or "pools").
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredDocs.map((doc) => {
                    const Icon = doc.icon;
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl border border-white/5 bg-slate-900/30 hover:bg-slate-900/50 hover:border-white/10 transition-all duration-300 group flex items-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
                        <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                            {doc.category}
                          </span>
                          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {highlightText(doc.title, searchQuery)}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {highlightText(doc.excerpt, searchQuery)}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSection(doc.id);
                              setSearchQuery('');
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-all mt-2 cursor-pointer"
                          >
                            Read Article <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Active Article rendering */
            <article className="glass-premium p-8 md:p-12 rounded-3xl space-y-8 shadow-2xl relative overflow-hidden">
              {/* Cinematic subtle glow behind the active article */}
              <div className="absolute -top-1/4 -right-1/4 w-[250px] h-[250px] bg-primary/10 blur-[90px] rounded-full pointer-events-none" />

              {activeSection === 'getting-started' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Getting Started with NexVault
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    Welcome to NexVault, a next-generation platform engineered to bring institutional-grade security, asset protection, and pooled financial control directly to your browser.
                  </p>

                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4 shadow-inner">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-400" /> Core Concepts
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      NexVault coordinates shared spending structures, manages localized ledger integrity, and protects passwords and vault secrets through a unified interface. Before starting, configure your vault and establish a transaction ledger account.
                    </p>
                  </div>

                  <h2 className="text-lg font-bold text-white pt-4">Onboarding in 3 Steps</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold text-xs mb-3 border border-blue-500/20">1</div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Create Account</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Register with a secure password and configure your credentials.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold text-xs mb-3 border border-blue-500/20">2</div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Initialize Ledger</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Establish your primary account structure to validate historical transactions.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold text-xs mb-3 border border-blue-500/20">3</div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Secure Vault</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Unlock your cryptographically shielded storage to protect digital assets.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'accounts-dash' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Accounts & Dashboard
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    The dashboard functions as a centralized command center, coordinating accounts, limits, pooled spending, and digital vaults.
                  </p>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">System Architecture Flow</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Every user is allocated a primary account that can hold individual assets or link directly to shared pools. The dashboard calculates real-time limits, active ledger states, and recent activity directly in the client.
                  </p>

                  <div className="border border-white/5 rounded-2xl bg-slate-900/60 p-6 space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Understanding Balances</h4>
                    <ul className="space-y-3 text-xs text-slate-300">
                      <li className="flex gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div>
                          <strong>Available Limit:</strong> The exact remaining credit or liquidity authorized for immediate use.
                        </div>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div>
                          <strong>Ledger Balance:</strong> The sum of all validated transactions calculated chronologically from your initial entry.
                        </div>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div>
                          <strong>Pending Pool Liabilities:</strong> Outlays incurred within credit pools that have not yet been settled by repayments.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeSection === 'shared-pools' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Shared Credit Pools
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    Shared credit pools enable multiple users to coordinate and spend from a single, unified allocation with predefined parameters and joint accountability.
                  </p>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">How Shared Pool Limits Work</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instead of individual silos, the system establishes a maximum ceiling for the shared pool. Members draw liquidity from this pool under the following operational guidelines:
                  </p>

                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-450" /> Mathematical Limits & Allocation Formula
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The total available limit for any member in a shared pool is calculated as:
                    </p>
                    <div className="bg-[#070b14] p-4 rounded-xl border border-white/5 text-center font-mono text-xs text-blue-400 shadow-inner">
                      Available Limit = Min(Individual Allocation, Pool Ceiling - Active Outlays)
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This double-gate ensures that an individual user can never exceed their explicit limit, nor can the group's cumulative outlays breach the overall pool ceiling.
                    </p>
                  </div>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Joint Accountability Principles</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    All transactions made against the pool are logged publicly inside the ledger. While spending is calculated individually, pool status and debt obligations belong to the collective. Repayments restore the pool ceiling instantly, clearing liabilities for all members.
                  </p>
                </div>
              )}

              {activeSection === 'repayments' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Repayments & Spending Analytics
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    To maintain fiscal accuracy, NexVault differentiates between standard expense transactions and capital repayments.
                  </p>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">The Spending Analytics Exclusion</h2>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Crucial Accounting Standard
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                      Repayments are strictly excluded from spending analytics charts and insights.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      This is done to prevent double-counting: when a user initiates an out-of-pocket transaction, it is categorized and recorded as an expense (outflow). If the subsequent repayment of that pool debt was also treated as spending, the transaction would register twice, skewing insights, inflating reported expenses, and corrupting financial statements.
                    </p>
                  </div>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Repayment Ledger Flow</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Initiating a repayment clears active liabilities and restores pool limits. Because a repayment balances a debt rather than acquiring a new product or service, it registers as a ledger adjustment rather than a spending category.
                  </p>
                </div>
              )}

              {activeSection === 'ledger-validation' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Historical Ledger Validation
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    Historical ledger validation is the integrity layer of NexVault, ensuring that transactions remain consistent, untampered, and chronological.
                  </p>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">What is Historical Ledger Validation?</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Unlike traditional databases that display superficial snapshots, NexVault implements <strong>timeline consistency enforcement</strong> and <strong>historical balance integrity validation</strong>. Every time you view your dashboard or trigger an audit:
                  </p>
                  
                  <ol className="space-y-3 text-xs text-slate-300 pl-1">
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">1</div>
                      <p><strong>Chronological Verification:</strong> The system starting balance propagates chronologically, re-calculating the impact of every debit and credit transaction.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">2</div>
                      <p><strong>Mathematical Integrity Checks:</strong> It verifies that at no historical point did the account total fall below authorized overdraft limits or system ceilings.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">3</div>
                      <p><strong>Timeline Consistency:</strong> Ensures that all transactions are strictly ordered. Gaps, post-dated adjustments, or out-of-order logs are flagged to prevent balance discrepancies.</p>
                    </li>
                  </ol>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Why Historical Transactions Can Fail</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    During synchronization or auditing, validation warnings or transaction failures might arise due to:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-350 pt-2">
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5">
                      <h5 className="font-bold text-white mb-1.5 uppercase tracking-wider text-[10px] text-blue-400">Balance Underflow</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">If a past transaction is edited or inserted out of order, it may calculate a historical balance below zero, causing a validation failure.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5">
                      <h5 className="font-bold text-white mb-1.5 uppercase tracking-wider text-[10px] text-blue-400">Timeline Drift</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">System latency or disconnected client clocks can create discrepancies in timestamps, failing the consistency check.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'vault-security' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Secure Vault (AES-256-GCM)
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    Sensitive data such as digital coupons, recovery credentials, and security keys are protected via AES-256-GCM authenticated encryption.
                  </p>

                  <div className="p-6 rounded-2xl bg-emerald-950/10 border border-emerald-500/10 space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Architectural Shielding
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Vault data is encrypted at rest using AES-256-GCM and protected through secure backend access controls. Authenticated encryption ensures that data is not only scrambled, but its authenticity is verified before decryption occurs, preventing cipher manipulation.
                    </p>
                  </div>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Key Security Measures</h2>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-455 border border-blue-500/20 flex items-center justify-center shrink-0 font-bold text-xs">A</div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Randomized Nonces (IVs)</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">Every encryption operation utilizes a unique 12-byte cryptographically secure initialization vector, ensuring identical plaintexts generate different ciphertexts.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-455 border border-blue-500/20 flex items-center justify-center shrink-0 font-bold text-xs">B</div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Transparent ORM Integration</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">Decryption happens dynamically in server memory during authorized requests, ensuring that raw values are never stored on persistent disks or exposed to loggers.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'trust-privacy' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Data Trust & Privacy
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    NexVault implements strict guidelines to ensure that user data and operational integrity remain secure.
                  </p>

                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Our Commitments</h2>
                  <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
                    <p>
                      All customer digital identifiers, transactional histories, and credential files are classified under maximum confidentiality levels.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-350">
                      <li><strong>Secure Session Management:</strong> Automated token revocations, HttpOnly cookies, and localized CSRF validations guard active sessions.</li>
                      <li><strong>Technical Accuracy & Disclosure:</strong> NexVault rejects misleading marketing terms. We explicitly clarify that our storage uses server-side encrypted-at-rest structures, audited through access controls, rather than hypothetical end-to-end setups.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeSection === 'faqs' && (
                <div className="space-y-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    FAQs & Troubleshooting
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    Find fast answers for common questions regarding limits, sync warnings, and vault recovery.
                  </p>

                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Q: Why did my validation audit generate a balance synchronization warning?</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        A: A sync warning indicates that the system discovered a timeline drift or an out-of-order transaction. Running a manual balance re-synchronization from the Help Center corrects the timeline propagation.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Q: Why are payments in shared credit pools creating multiple ledger entries?</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        A: To ensure transparent double-entry accounting, a pool repayment triggers individual ledger updates for both the pool status itself and the individual contributor's record.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </article>
          )}
        </main>
      </div>

    </SupportPageContainer>
  );
}

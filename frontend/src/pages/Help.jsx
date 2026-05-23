import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Layers, 
  Info,
  CheckCircle2,
  Lock,
  ArrowRight,
  X
} from 'lucide-react';
import SupportPageContainer from '../components/SupportPageContainer';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);

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

  const toggleCard = (id) => {
    if (expandedCard === id) {
      setExpandedCard(null);
    } else {
      setExpandedCard(id);
    }
  };

  const troubleshootingGuides = [
    {
      id: 'sync-warning',
      category: 'Ledger & Balances',
      title: 'Understanding Historical Balance Validation & Sync Warnings',
      subtitle: 'What to do when the system flags a historical balance consistency mismatch.',
      icon: RefreshCw,
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
      borderStyle: 'group-hover:border-amber-500/30',
      glowColor: 'rgba(245, 158, 11, 0.15)',
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            NexVault does not rely on superficial snapshot numbers. We use a precise **timeline consistency enforcement** model. When you view your accounts, the system recalculates your balance historically, sequential step by sequential step, from the first transaction to the present day.
          </p>
          <div className="bg-[#070b14]/80 p-5 rounded-2xl border border-white/5 space-y-3">
            <h5 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-slate-350">
              <Info className="w-4 h-4 text-blue-400" /> Historical Timeline Propagation Logic
            </h5>
            <p className="text-slate-400 text-xs leading-relaxed">
              Every balance update propagates chronologically forward. If you modify or insert an entry in the past, or if your local browser state drifts due to clock differences (latency), the historical chain breaks, generating a **balance synchronization warning**.
            </p>
          </div>
          <h5 className="font-bold text-white text-xs uppercase tracking-wider text-slate-350 mt-5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Step-by-step resolution:
          </h5>
          <ol className="list-decimal pl-5 space-y-2 text-slate-400 text-xs leading-relaxed">
            <li>Open the affected Account page inside your dashboard.</li>
            <li>Click the **Verify Ledger** button to initiate the balance synchronization audit.</li>
            <li>The engine will pull the official transaction sequence, correct any timeline drifts, and rebuild the historical balance chain.</li>
            <li>Once complete, your balances are re-synchronized, and the integrity warning will clear.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'failed-transactions',
      category: 'Transactions',
      title: 'Why Historical Transactions Can Fail Validation',
      subtitle: 'Why editing or adding past transactions can trigger validation failures.',
      icon: AlertCircle,
      badgeColor: 'text-rose-400 bg-rose-400/10 border-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]',
      borderStyle: 'group-hover:border-rose-500/30',
      glowColor: 'rgba(244, 63, 94, 0.15)',
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            During a transaction write cycle, our server performs strict chronological validations to maintain ledger integrity. Historical balance checks protect user assets from retroactively unauthorized changes.
          </p>
          <div className="p-5 rounded-2xl bg-rose-950/10 border border-rose-500/15 space-y-3">
            <h5 className="font-bold text-rose-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" /> Common Failure Triggers:
            </h5>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 text-xs leading-relaxed">
              <li><strong>Historical Balance Underflow:</strong> Inserting an outflow in the past that would calculate a negative balance at that historical point (even if subsequent deposits make the present balance positive).</li>
              <li><strong>Ledger Timeline Drift:</strong> The transaction timestamp precedes the account creation sequence, causing a timeline failure.</li>
              <li><strong>Post-Facto Signature Invalidation:</strong> Changing critical transaction parameters after authorization, violating timeline consistency checks.</li>
            </ul>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            To resolve a failed validation, review the exact timestamp of the transaction and ensure your historical account balance was sufficient at that past moment to cover the debit.
          </p>
        </div>
      )
    },
    {
      id: 'pool-repayments',
      category: 'Credit Pools',
      title: 'Why Repayments Create Multiple Ledger Entries',
      subtitle: 'Understanding the double-entry accounting model behind pool settlements.',
      icon: Layers,
      badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]',
      borderStyle: 'group-hover:border-blue-500/30',
      glowColor: 'rgba(59, 130, 246, 0.15)',
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            When you initiate a repayment against a Shared Credit Pool, you are settling pooled liabilities. To preserve technical accuracy and audit compliance, the system utilizes double-entry principles.
          </p>
          <p>
            A single repayment will generate **multiple distinct entries** in the ledger:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Entry 1: Pool Level</span>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">A credit entry applied directly to the Shared Pool, restoring the pool ceiling and resetting pooled liabilities.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Entry 2: User Level</span>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">An offsetting entry added to the individual contributor's outlay ledger, confirming they have fulfilled their share of the group debt.</p>
            </div>
          </div>
          <p className="text-xs text-slate-450 leading-relaxed pt-2">
            This double-entry model guarantees that pool totals and individual accountability always balance precisely, preventing phantom debt calculations or unaccounted outlays.
          </p>
        </div>
      )
    },
    {
      id: 'limit-calculations',
      category: 'Credit Pools',
      title: 'Shared Credit Pool Limit Calculations Explained',
      subtitle: 'How pool spending parameters and remaining ceiling regulate member credit limits.',
      icon: Info,
      badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]',
      borderStyle: 'group-hover:border-purple-500/30',
      glowColor: 'rgba(168, 85, 247, 0.15)',
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            Your available limit in a shared pool is governed by a secure, real-time bounding logic that evaluates both group assets and individual thresholds.
          </p>
          <div className="bg-[#070b14] p-5 rounded-2xl border border-white/5 space-y-3 text-xs">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider text-slate-350">Available Limit Formula:</h5>
            <p className="font-mono text-xs text-purple-400 text-center py-3 bg-[#0c0f1a] rounded-xl border border-white/5 shadow-inner">
              Available Limit = Min(User Allocation, Pool Ceiling - Group Total Spent)
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Where "Group Total Spent" represents the outstanding liabilities of all pool participants combined.
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            If your limit is lower than expected, it is typically because another member has utilized the shared pool's headroom, temporarily lowering the pool's remaining ceiling. Limit parameters are dynamically updated as soon as any member makes a repayment.
          </p>
        </div>
      )
    },
    {
      id: 'analytics-exclusion',
      category: 'Analytics',
      title: 'Why Repayments are Excluded from Spending Analytics',
      subtitle: 'Why credit repayments do not register as new spending outlays.',
      icon: Info,
      badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
      borderStyle: 'group-hover:border-emerald-500/30',
      glowColor: 'rgba(16, 185, 129, 0.15)',
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            Spending analytics dashboard graphs are engineered to give you a clear, unpolluted overview of your category outlays (e.g., dining, utilities, software).
          </p>
          <div className="bg-emerald-950/10 border border-emerald-500/15 p-5 rounded-2xl space-y-3">
            <h5 className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Double-Counting Prevention:
            </h5>
            <p className="text-slate-455 text-xs leading-relaxed">
              When you purchase an item using credit pool funds, it is logged and categorized as an outflow. If the repayment of that pool debt was also tracked in your spending charts, the same dollar transaction would show up twice.
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            To maintain technical integrity and prevent false expense inflation, repayments are categorized as debt settlement actions and strictly filtered out of category spending analytics.
          </p>
        </div>
      )
    },
    {
      id: 'vault-recovery',
      category: 'Security',
      title: 'Secure Vault Account Onboarding & Recovery Guides',
      subtitle: 'How to safely recovery encrypted credentials without access loss.',
      icon: Lock,
      badgeColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]',
      borderStyle: 'group-hover:border-cyan-500/30',
      glowColor: 'rgba(6, 182, 212, 0.15)',
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            Vault storage is encrypted at rest using **AES-256-GCM** secure keys. Decryption occurs inside the browser or authorized memory using secure keys derived from user authentication.
          </p>
          <div className="bg-[#070b14] p-5 rounded-2xl border border-white/5 text-xs space-y-3 text-slate-300">
            <p className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-slate-350">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Critical Recovery Rules:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 leading-relaxed">
              <li>NexVault administrators cannot retrieve passwords or coupons for you, as the data is stored in encrypted format in the database.</li>
              <li>Always print or write down your Recovery Key during onboarding.</li>
              <li>If you forget your primary credentials, navigate to the **Account Recovery** page and insert your 24-word recovery sheet to unlock your encrypted profiles.</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const filteredGuides = troubleshootingGuides.filter(guide => 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SupportPageContainer
      activePage="help"
      pageTitle="Help Center"
    >

      {/* Hero Banner Section */}
      <section className="relative z-10 py-20 px-6 max-w-4xl mx-auto text-center space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-premium border border-white/10 mb-2"
        >
          <HelpCircle className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">
            Actionable Resolution Hub
          </span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight"
        >
          How can we help you <br />
          <span className="animate-shimmer-text text-cinematic-gradient">resolve a system issue?</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm md:text-base text-slate-400 max-w-xl mx-auto font-medium leading-relaxed"
        >
          Search our actionable self-care guides covering balance synchronization, credit limit formulas, transaction errors, and secure recovery protocols.
        </motion.p>

        {/* Interactive Search */}
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
            placeholder="Search troubleshooting topics (e.g. sync, limits, analytics)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-4 pl-11 pr-16 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] glass-premium"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-12 top-[15px] p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
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

      {/* Troubleshooting Section */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Actionable Troubleshooting Guides</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
            {filteredGuides.length} articles
          </span>
        </div>

        {filteredGuides.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 glass-premium border border-white/5 rounded-3xl p-8 space-y-4 shadow-xl"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-slate-500 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-350 text-sm">No troubleshooting articles found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">Try adjusting your keywords (e.g. searching for "sync", "ledger", or "limit").</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredGuides.map((guide, idx) => {
              const Icon = guide.icon;
              const isExpanded = expandedCard === guide.id;
              return (
                <motion.div 
                  key={guide.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden group ${
                    isExpanded 
                      ? 'bg-slate-900/40 border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.5)] glass-premium' 
                      : 'bg-slate-900/20 border-white/5 hover:bg-slate-900/30 hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                  style={{
                    boxShadow: isExpanded ? `0 15px 40px -10px ${guide.glowColor}` : undefined
                  }}
                >
                  <button 
                    onClick={() => toggleCard(guide.id)}
                    className="w-full p-6 text-left flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105 ${guide.badgeColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                          {guide.category}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                          {guide.title}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed font-medium">
                          {guide.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0 text-slate-400 transition-colors group-hover:text-white ${isExpanded ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : ''}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-white/5 mx-6 mt-1">
                          {guide.content}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Documentation Link Call-out */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-950/20 to-indigo-950/10 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 glass-premium shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Looking for detailed system documentation?</h4>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed font-medium">
              Read our comprehensive guides covering system limits, mathematical allocation structures, double-entry repayment models, and vault security.
            </p>
          </div>
          <Link 
            to="/docs" 
            className="px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] font-bold text-xs text-white active:scale-98 transition-all shrink-0 flex items-center gap-1.5 justify-center relative z-10 border border-blue-400/20"
          >
            Open Product Docs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </SupportPageContainer>
  );
}

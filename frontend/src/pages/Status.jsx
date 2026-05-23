import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Database, 
  ShieldCheck, 
  Lock, 
  Cpu
} from 'lucide-react';
import SupportPageContainer from '../components/SupportPageContainer';

export default function Status() {
  const [lastChecked, setLastChecked] = useState(new Date());
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const interval = setInterval(() => {
      setLastChecked(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveTooltip(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleInteraction = (e, block) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest('.health-grid-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    
    setActiveTooltip({
      day: block.day,
      status: block.status,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top
    });
  };

  const subsystems = [
    {
      name: 'API Gateway',
      description: 'Coordinates public entryways, request routers, and backend microservices.',
      status: 'Operational',
      sla: '99.98% SLA',
      ping: '34ms',
      icon: Server
    },
    {
      name: 'Core Database Storage',
      description: 'Manages ledger persistence, account states, and historical chains.',
      status: 'Operational',
      sla: '99.99% SLA',
      ping: '15ms',
      icon: Database
    },
    {
      name: 'User Authentication System',
      description: 'Handles token exchanges, user profiles, session logins, and credential salts.',
      status: 'Operational',
      sla: '100.0% SLA',
      ping: '22ms',
      icon: ShieldCheck
    },
    {
      name: 'AES-256-GCM Secure Vault',
      description: 'Guards encrypted-at-rest secrets, digital coupons, and access sheets.',
      status: 'Operational',
      sla: '100.0% SLA',
      ping: '8ms',
      icon: Lock
    },
    {
      name: 'Historical Analytics Engine',
      description: 'Processes timeline propagation, credit allocations, and analytics reports.',
      status: 'Operational',
      sla: '99.95% SLA',
      ping: '42ms',
      icon: Cpu
    }
  ];

  // Simulated 90-day health grid. 90 green squares for status history
  const healthBlocks = Array.from({ length: 90 }, (_, i) => ({
    day: 90 - i, // Counting down from 90 days ago to 1 day ago (yesterday)
    status: 'operational'
  }));

  return (
    <SupportPageContainer activePage="status" pageTitle="System Status">
      {/* Status Hero */}
      <section className="relative z-10 py-16 px-6 max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="p-8 rounded-3xl bg-emerald-950/10 border border-emerald-500/20 text-center space-y-6 shadow-[0_15px_45px_rgba(16,185,129,0.05)] glass-premium relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.08)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>All Systems Operational</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            NexVault Operational Transparency
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
            We provide real-time updates regarding core APIs, data integrity, and vault operations. All subsystems are currently executing within standard guidelines.
          </p>
          
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase font-mono bg-white/5 border border-white/10 px-4 py-2 rounded-xl inline-block">
            Last Checked: <span className="text-emerald-450">{lastChecked.toLocaleTimeString()}</span> | Auto-refreshing 60s
          </div>
        </motion.div>
      </section>

      {/* Subsystem Health Cards */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-12 space-y-6">
        <div className="border-b border-white/5 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Subsystem Operations</h3>
        </div>

        <div className="space-y-4">
          {subsystems.map((sub, idx) => {
            const Icon = sub.icon;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="p-5 rounded-2xl bg-slate-900/20 border border-white/5 hover:border-white/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-premium group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 text-slate-400 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.02)] group-hover:scale-105 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-white tracking-tight leading-snug">{sub.name}</h4>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed font-medium">{sub.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono text-slate-500 font-bold uppercase pt-1">
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-650" /> UPTIME: <span className="text-slate-350">{sub.sla}</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-650" /> LATENCY: <span className="text-slate-350">{sub.ping}</span></span>
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0 self-start sm:self-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{sub.status}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Historical Operational Grid (Timeline) */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-12">
        <div className="p-6 md:p-8 rounded-3xl bg-[#070b14]/65 border border-white/5 glass-premium shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight">System Operations History</h4>
              <p className="text-xs text-slate-450 font-medium">Chronological health history across the last 90 days.</p>
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/60 border border-white/10 px-3 py-1.5 rounded-lg font-mono">
              No incidents reported
            </span>
          </div>

          {/* Grid blocks with custom tooltip container */}
          <div className="space-y-4 relative health-grid-container">
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-2">
              {healthBlocks.map((block) => (
                <button 
                  key={block.day} 
                  type="button"
                  onMouseEnter={(e) => handleInteraction(e, block)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={(e) => handleInteraction(e, block)}
                  onFocus={(e) => handleInteraction(e, block)}
                  onBlur={() => setActiveTooltip(null)}
                  className="aspect-square w-full rounded bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/40 hover:border-emerald-500/50 hover:scale-110 transition-all cursor-help shadow-[0_0_10px_rgba(16,185,129,0.03)] hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  aria-label={`Day ${block.day} ago: Operational (No issues reported)`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
              <span>90 Days Ago</span>
              <span>Today</span>
            </div>

            {/* Custom Tooltip Overlay */}
            <AnimatePresence>
              {activeTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute z-30 pointer-events-none"
                  style={{
                    left: `${activeTooltip.x}px`,
                    top: `${activeTooltip.y}px`,
                    transform: 'translate(-50%, -125%)',
                  }}
                >
                  <div className="glass-premium bg-[#0c1322]/95 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-1 min-w-[190px] text-center backdrop-blur-md relative">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      {activeTooltip.day === 1 ? '1 Day Ago' : activeTooltip.day === 0 ? 'Today' : `${activeTooltip.day} Days Ago`}
                    </span>
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        Operational
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400/90 font-mono">
                      No incidents reported
                    </span>
                    {/* Tiny arrow pointing down */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0c1322] border-r border-b border-emerald-500/30 rotate-45" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Latency Metrics Grid */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/20 border border-white/5 glass-premium shadow-xl space-y-2 hover:-translate-y-0.5 hover:border-white/10 transition-all duration-300">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Average API Latency</span>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-cinematic-gradient bg-gradient-to-r from-emerald-450 to-teal-400 bg-clip-text text-transparent">34ms</div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">Cumulative round-trip router requests.</p>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/20 border border-white/5 glass-premium shadow-xl space-y-2 hover:-translate-y-0.5 hover:border-white/10 transition-all duration-300">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">System Response Time</span>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-cinematic-gradient bg-gradient-to-r from-emerald-450 to-teal-400 bg-clip-text text-transparent">42ms</div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">Full framework parsing cycle.</p>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/20 border border-white/5 glass-premium shadow-xl space-y-2 hover:-translate-y-0.5 hover:border-white/10 transition-all duration-300">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Analytics Processing</span>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-cinematic-gradient bg-gradient-to-r from-emerald-450 to-teal-400 bg-clip-text text-transparent">15ms</div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">Time required to propagate metrics.</p>
          </div>
        </div>
      </section>
    </SupportPageContainer>
  );
}

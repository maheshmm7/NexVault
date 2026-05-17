import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { BarChart3, ShieldCheck, Zap, Globe, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const MOCK_CHART_DATA = [
  { name: 'Mon', income: 4000, expense: 2400 },
  { name: 'Tue', income: 3000, expense: 1398 },
  { name: 'Wed', income: 2000, expense: 9800 },
  { name: 'Thu', income: 2780, expense: 3908 },
  { name: 'Fri', income: 1890, expense: 4800 },
  { name: 'Sat', income: 2390, expense: 3800 },
  { name: 'Sun', income: 3490, expense: 4300 },
];

export default function DashboardShowcase() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Parallax layers
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.85, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

  return (
    <section 
      id="dashboard-showcase"
      ref={containerRef}
      className="py-40 px-6 relative overflow-hidden bg-[#0f172a]"
    >
      {/* Background Decorative Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6"
          >
            <TrendingUp className="w-3 h-3" />
            Product Showcase
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-8 tracking-tight"
          >
            The Future of <span className="text-primary">Wealth Management</span> <br />
            is already here.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Move from fragmented tracking to a unified, intelligent ecosystem. 
            Real-time synchronization, bank-grade security, and AI-driven insights.
          </motion.p>
        </div>

        <motion.div 
          style={{ 
            perspective: 2000,
            opacity,
            scale,
            rotateX
          }}
          className="relative min-h-[700px] flex items-center justify-center"
        >
          {/* Main Dashboard Canvas (Base Layer) */}
          <motion.div 
            style={{ y: y3 }}
            className="relative glass-premium rounded-[48px] p-4 border border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.6)] bg-slate-900/60 w-full max-w-5xl aspect-[16/10] overflow-hidden"
          >
            <div className="h-full rounded-[36px] bg-[#0f172a] border border-white/5 overflow-hidden p-8 flex flex-col">
              {/* Fake Sidebar & Header */}
              <div className="flex justify-between items-center mb-10 opacity-50">
                <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-lg bg-white/10" />
                   <div className="w-32 h-8 bg-white/5 rounded-lg" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10" />
              </div>

              {/* Main Chart Area */}
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex justify-between items-end mb-8">
                     <div>
                        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Cash Flow Trend</div>
                        <div className="text-3xl font-bold">$12,840.00</div>
                     </div>
                     <div className="flex gap-2">
                        <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold">1W</div>
                        <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold">1M</div>
                        <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold">1Y</div>
                     </div>
                  </div>
                  <div className="flex-1 w-full opacity-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_CHART_DATA}>
                        <defs>
                          <linearGradient id="gIncomeL" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fill="url(#gIncomeL)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating UI Elements (Parallax Layers) */}
          
          {/* Layer 1: Stat Cards */}
          <motion.div 
            style={{ y: y1 }}
            className="absolute -top-10 -left-20 w-72 glass-premium p-6 rounded-[32px] border border-white/10 shadow-2xl z-30 hidden xl:block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-secondary text-xs font-bold">
                <ArrowUpRight className="w-3 h-3" />
                +12.5%
              </div>
            </div>
            <div className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Total Balance</div>
            <div className="text-2xl font-bold">$24,650.00</div>
          </motion.div>

          {/* Layer 2: Recent Transactions */}
          <motion.div 
            style={{ y: y2 }}
            className="absolute top-20 -right-20 w-80 glass-premium p-6 rounded-[32px] border border-white/10 shadow-2xl z-30 hidden xl:block bg-slate-900/80 backdrop-blur-2xl"
          >
            <div className="font-bold mb-6 flex justify-between items-center">
              <span>Recent Activity</span>
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</div>
            </div>
            <div className="space-y-5">
              {[
                { name: "Apple Store", date: "Today, 2:45 PM", amount: "-$199.00", icon: <Zap className="w-4 h-4 text-orange-400" />, bg: "bg-orange-500/10" },
                { name: "Salary Deposit", date: "Yesterday", amount: "+$4,200.00", icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />, bg: "bg-emerald-500/10" },
                { name: "Amazon", date: "Mar 14", amount: "-$84.50", icon: <Globe className="w-4 h-4 text-blue-400" />, bg: "bg-blue-500/10" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group cursor-default">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{item.name}</div>
                    <div className="text-[10px] text-muted">{item.date}</div>
                  </div>
                  <div className={`text-sm font-bold ${item.amount.startsWith('+') ? 'text-secondary' : 'text-white'}`}>
                    {item.amount}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Layer 3: Intelligence Card */}
          <motion.div 
            style={{ y: y3 }}
            whileHover={{ scale: 1.05, y: -20 }}
            className="absolute -bottom-16 right-20 w-72 glass-premium p-6 rounded-[32px] border border-white/10 shadow-2xl z-40 hidden lg:block bg-primary/10 backdrop-blur-3xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <span className="font-bold">Intelligence Active</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              I've detected a $45 saving opportunity on your recurring "Cloud Hosting" subscription.
            </p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors">
              Review Suggestion
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


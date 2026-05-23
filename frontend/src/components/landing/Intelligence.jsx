import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, ChevronDown, Sparkles } from 'lucide-react';

const INSIGHTS = [
  {
    icon: TrendingUp,
    title: 'Spending Analysis',
    text: 'Your food & dining expenses are 15% lower than last month. Great job!',
    type: 'success',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    icon: AlertTriangle,
    title: 'Upcoming Expiry',
    text: 'Amazon 20% Off coupon expires in 2 days. Use it now!',
    type: 'warning',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10'
  },
  {
    icon: Lightbulb,
    title: 'Smart Recommendation',
    text: 'Consider moving $20,000 to your savings vault for better interest.',
    type: 'info',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10'
  }
];

export default function Intelligence() {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <section id="intelligence" className="py-32 px-6 overflow-hidden relative">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-20">
        {/* Text Column */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
              Intelligent Insights. <br />
              <span className="text-blue-400">Proactive Wealth.</span>
            </h2>
            <p className="text-lg text-muted mb-10 max-w-xl">
              NEXVAULT doesn't just track your money. It analyzes your habits 
              and provides actionable intelligence to help you build a better 
              financial future.
            </p>
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-secondary" />
                <span className="font-medium text-sm md:text-base">AI Category Analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-secondary" />
                <span className="font-medium text-sm md:text-base">Real-time Notifications</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Animation Column */}
        <div className="flex-1 relative w-full max-w-lg">
          <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative space-y-6">
            {INSIGHTS.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: idx * 0.15,
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ x: -6, transition: { duration: 0.2 } }}
                onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
                className={`glass-premium p-6 rounded-3xl border ${
                  activeIdx === idx ? 'border-primary/50 shadow-[0_10px_30px_rgba(59,130,246,0.15)] bg-slate-900/60' : 'border-white/5 hover:border-white/10'
                } flex flex-col shadow-xl cursor-pointer transition-all duration-300`}
              >
                <div className="flex items-start gap-5 w-full">
                  <div className={`w-12 h-12 rounded-2xl ${insight.bg} flex items-center justify-center shrink-0`}>
                    <insight.icon className={`w-6 h-6 ${insight.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-lg">{insight.title}</h4>
                      <ChevronDown className={`w-5 h-5 text-muted transition-transform duration-300 ${
                        activeIdx === idx ? 'rotate-180 text-white' : ''
                      }`} />
                    </div>
                    <p className="text-muted text-sm leading-relaxed mt-1">{insight.text}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {activeIdx === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 pt-5 border-t border-white/5 text-sm space-y-3 pl-17">
                        {idx === 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between font-medium">
                              <span className="text-muted">Last Month Spending:</span>
                              <span className="text-white">$450.00</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span className="text-muted">This Month spending:</span>
                              <span className="text-secondary font-bold">$382.50</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold pt-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Optimal budget limit achieved!</span>
                            </div>
                          </div>
                        )}
                        {idx === 1 && (
                          <div className="space-y-2">
                            <div className="flex justify-between font-medium">
                              <span className="text-muted">Expiry Date:</span>
                              <span className="text-orange-400 font-bold">2 days remaining</span>
                            </div>
                            <div className="flex justify-between font-medium items-center">
                              <span className="text-muted">Promo Code:</span>
                              <span className="font-mono text-white select-all bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 text-xs">
                                AMZN20
                              </span>
                            </div>
                            <div className="text-xs text-orange-400/90 font-medium leading-relaxed pt-1">
                              ✓ Auto reminders will keep notifying you until resolution.
                            </div>
                          </div>
                        )}
                        {idx === 2 && (
                          <div className="space-y-2">
                            <div className="flex justify-between font-medium">
                              <span className="text-muted">Current Yield:</span>
                              <span className="text-white">0.05% APY (Standard checking)</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span className="text-muted">NexVault Yield:</span>
                              <span className="text-primary font-bold">4.85% APY</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold pt-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Projected earnings: +$970.00 / year</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


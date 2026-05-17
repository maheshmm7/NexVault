import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

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
    text: 'Consider moving 20,000 to your savings vault for better interest.',
    type: 'info',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10'
  }
];

export default function Intelligence() {
  return (
    <section className="py-32 px-6 overflow-hidden">
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
                <span className="font-medium">AI Category Analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-secondary" />
                <span className="font-medium">Real-time Notifications</span>
              </div>
            </div>

          </motion.div>
        </div>

        {/* Animation Column */}
        <div className="flex-1 relative w-full max-w-lg">
          <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
          <div className="relative space-y-6">
            {INSIGHTS.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: idx * 0.2,
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ x: -10, transition: { duration: 0.3 } }}
                className="glass-premium p-6 rounded-3xl border border-white/5 flex items-start gap-5 shadow-xl cursor-default"
              >
                <div className={`w-12 h-12 rounded-2xl ${insight.bg} flex items-center justify-center shrink-0`}>
                  <insight.icon className={`w-6 h-6 ${insight.color}`} />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">{insight.title}</h4>
                  <p className="text-muted text-sm leading-relaxed">{insight.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

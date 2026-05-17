import { motion } from 'framer-motion';
import { BarChart3, Lock, RefreshCcw, Target, Wallet, Cpu } from 'lucide-react';
import { fadeInUp, staggeredContainer } from '../../config/motion';

const FEATURES = [
  {
    title: 'Intelligent Analytics',
    description: 'Deep dive into your spending patterns with AI-driven charts and category insights.',
    icon: BarChart3,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10'
  },
  {
    title: 'Secure Coupon Vault',
    description: 'Store and track discount codes. Get reminders before they expire so you never miss a deal.',
    icon: Lock,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    title: 'Recurring Tracking',
    description: 'Automate your financial routines. Manage subscriptions and recurring payments effortlessly.',
    icon: RefreshCcw,
    color: 'text-purple-400',

    bg: 'bg-purple-500/10'
  },
  {
    title: 'Goal Management',
    description: 'Set financial targets and track your progress with beautiful progress indicators.',
    icon: Target,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10'
  },
  {
    title: 'Multi-Account Sync',
    description: 'Connect banks, credit cards, and digital wallets for a unified financial view.',
    icon: Wallet,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10'
  },
  {
    title: 'Smart Intelligence',
    description: 'Receive proactive alerts and personalized recommendations to optimize your wealth.',
    icon: Cpu,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10'
  }
];

export default function FeatureSections() {
  return (
    <section className="py-32 px-6 bg-[#0B1222]">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggeredContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="p-8 rounded-[32px] glass-premium border border-white/5 hover:border-white/10 transition-colors group cursor-default"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

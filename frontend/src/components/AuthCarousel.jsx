import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, TrendingUp, Cpu, CheckCircle } from 'lucide-react';
import Logo from './Logo';

const SLIDES = [
  {
    title: 'Bank-Grade Security Vaults',
    subtitle: 'Your assets, cryptographic protections, absolute peace of mind.',
    details: [
      'AES-256 Multi-sig encryption standard',
      'Secure off-chain recovery code safeguards',
      'Real-time network anomaly scanners'
    ],
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    preview: (
      <div className="glass-premium rounded-2xl p-5 border border-white/10 bg-slate-900/50 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Crypto Engine</span>
          <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
        </div>
        <div className="h-10 bg-black/40 border border-white/5 rounded-xl flex items-center px-4 justify-between">
          <span className="font-mono text-xs text-white">vault-key_aes_256...</span>
          <Shield className="w-4 h-4 text-emerald-400 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 bg-emerald-500/30 rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-emerald-400" />
          </div>
          <span className="text-[9px] font-bold text-emerald-300">98% Secure</span>
        </div>
      </div>
    )
  },
  {
    title: 'AI Wealth Analytics',
    subtitle: 'Deep spending pattern models, predictive tracking, zero effort.',
    details: [
      'AI spending limit optimization triggers',
      'Interactive multi-currency area charts',
      'Auto category anomaly detection systems'
    ],
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    preview: (
      <div className="glass-premium rounded-2xl p-5 border border-white/10 bg-slate-900/50 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Cash Balance</span>
            <div className="text-xl font-bold mt-0.5">$24,650.00</div>
          </div>
          <div className="text-[9px] font-bold text-secondary flex items-center gap-0.5 bg-secondary/10 px-1.5 py-0.5 rounded-md border border-secondary/20">
            ▲ +12%
          </div>
        </div>
        {/* Visual Miniature Chart bars */}
        <div className="h-12 flex items-end gap-1.5 pt-2">
          {[30, 45, 25, 60, 75, 50, 90].map((h, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-t-sm ${i === 6 ? 'bg-primary' : 'bg-primary/40'}`} 
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    )
  },
  {
    title: 'Proactive Intelligence',
    subtitle: 'Continuous savings target scans and automatic deal alerts.',
    details: [
      'Smart expiring coupon alarm alerts',
      'Actionable interest-yield pointers',
      'Dynamic multi-account balance reviews'
    ],
    icon: Cpu,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    preview: (
      <div className="glass-premium rounded-2xl p-5 border border-white/10 bg-slate-900/50 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white">AI Suggestion</div>
            <div className="text-[9px] text-muted">Subscription Optimizer</div>
          </div>
        </div>
        <p className="text-[10px] text-white/80 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
          "I've found a $45 saving opportunity on your recurrent Cloud Host charges."
        </p>
      </div>
    )
  }
];

export default function AuthCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="w-full h-full flex flex-col justify-center max-w-lg mx-auto pr-0 lg:pr-8">
      {/* Decorative blurred back light */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-80 h-80 bg-primary/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Floating Badge */}
      <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
        <Logo size={24} showText={true} textClass="text-lg opacity-85 font-black text-main" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-indicator-pulse" />
        <span className="text-[10px] font-bold uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Secure Portal</span>
      </div>

      <div className="min-h-[460px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Slide Heading & Description */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white mb-3">
                {slide.title}
              </h2>
              <p className="text-muted text-sm max-w-sm mx-auto lg:mx-0">
                {slide.subtitle}
              </p>
            </div>

            {/* Simulated Live Product Preview */}
            <div className="relative group max-w-sm mx-auto lg:mx-0">
              <div className={`absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent blur-xl opacity-35 rounded-2xl pointer-events-none`} />
              <div className="relative z-10">
                {slide.preview}
              </div>
            </div>

            {/* Bullet Highlights */}
            <div className="space-y-3.5 max-w-sm mx-auto lg:mx-0 text-left">
              {slide.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted font-medium">{detail}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel indicators (interactive pagination) */}
        <div className="flex gap-2.5 pt-8 justify-center lg:justify-start">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="h-2 flex items-center group cursor-pointer focus:outline-none"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                index === i ? 'w-8 bg-primary' : 'w-2 bg-white/15 hover:bg-white/30'
              }`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

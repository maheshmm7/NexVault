import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BRANDING } from '../../config/branding';
import { fadeInUp, staggeredContainer } from '../../config/motion';
import Logo from '../Logo';
import { ArrowRight, Play, X, Wallet, TrendingUp, ArrowUpRight, BarChart3, Shield } from 'lucide-react';

/**
 * PRODUCT DEMO CONFIGURATION
 * If you have a video file (e.g., /assets/demo.mp4) or a URL, 
 * paste it here to replace the simulated product tour.
 */
const DEMO_VIDEO_URL = null; 

export default function LandingHero() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  
  // Parallax effect for the visual anchor
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <section 
      onMouseMove={handleMouseMove}
      className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-6 overflow-hidden"
    >
      <motion.div
        variants={staggeredContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center max-w-4xl mx-auto"
      >
        {/* Floating Brand Badge */}
        <motion.div 
          variants={fadeInUp}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-premium border border-white/10 mb-8"
        >
          <Logo size={18} showText={false} />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">
            {BRANDING.NAME} v2.0 Released
          </span>
        </motion.div>

        {/* Cinematic Headline */}
        <motion.h1 
          variants={fadeInUp}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-shimmer-text text-cinematic-gradient"
        >
          The Next-Generation <br />
          <span className="text-white">Financial Operating System</span>
        </motion.h1>

        {/* High-Density Description */}
        <motion.p 
          variants={fadeInUp}
          className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Control your financial world with intelligent analytics, secure vaulting, 
          and real-time tracking. Premium finance management, built for the modern era.
        </motion.p>

        {/* CTA Actions */}
        <motion.div 
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => setShowDemo(true)}
            className="w-full sm:w-auto px-8 py-4 glass-premium text-white rounded-2xl font-bold text-lg hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
            Watch Demo
          </button>
        </motion.div>
      </motion.div>

      {/* Hero Visual Anchor (High Fidelity Dashboard Preview) */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ rotateX, rotateY, perspective: 1000 }}
        transition={{ delay: 0.6, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="mt-20 w-full max-w-6xl mx-auto px-4 relative group/anchor"
      >
        <div className="absolute inset-0 bg-blue-500/10 blur-[120px] rounded-full opacity-30 group-hover/anchor:opacity-50 transition-opacity duration-1000" />
        <div className="relative glass-premium rounded-t-[40px] border-x border-t border-white/10 p-2 overflow-hidden aspect-[16/8.5] shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
           <div className="w-full h-full rounded-t-[32px] bg-[#0f172a] overflow-hidden relative border border-white/5">
              {/* Product Preview Frame */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/95" />
              <div className="p-8 h-full flex flex-col">
                {/* Mock Header */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex gap-4 items-center">
                    <Logo size={24} showText={true} textClass="text-lg opacity-40" />
                    <div className="w-px h-6 bg-white/10" />
                    <div className="w-32 h-8 bg-white/5 rounded-lg" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5" />
                    <div className="w-8 h-8 rounded-full bg-primary/20" />
                  </div>
                </div>
                
                <div className="grid grid-cols-12 gap-6 flex-1">
                  {/* Left Main Section */}
                  <div className="col-span-8 space-y-6">
                    {/* Main Chart Card */}
                    <div className="h-56 bg-white/[0.03] rounded-3xl border border-white/5 p-6 relative overflow-hidden group/chart">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Financial Momentum</div>
                            <div className="text-2xl font-bold">$12,450.80</div>
                          </div>
                          <div className="flex gap-1.5">
                            {[1,2,3].map(i => <div key={i} className={`w-8 h-4 rounded-md ${i===2 ? 'bg-primary/20' : 'bg-white/5'}`} />)}
                          </div>
                       </div>
                       {/* Abstract Chart Graphic */}
                       <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
                       <div className="absolute bottom-6 left-6 right-6 h-24 flex items-end gap-1">
                          {[...Array(20)].map((_, i) => (
                            <div 
                              key={i} 
                              className="flex-1 bg-primary/30 rounded-t-sm transition-all duration-1000 group-hover/chart:bg-primary/50"
                              style={{ height: `${Math.random() * 80 + 20}%` }}
                            />
                          ))}
                       </div>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="h-36 glass-premium rounded-3xl border border-white/5 p-5">
                         <div className="flex items-center gap-3 mb-4">
                           <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                             <TrendingUp className="w-4 h-4" />
                           </div>
                           <span className="text-xs font-bold text-muted uppercase tracking-widest">Savings Rate</span>
                         </div>
                         <div className="text-2xl font-bold">24.5%</div>
                         <div className="text-[10px] text-secondary font-bold mt-1">+2.4% this month</div>
                      </div>
                      <div className="h-36 glass-premium rounded-3xl border border-white/5 p-5">
                         <div className="flex items-center gap-3 mb-4">
                           <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                             <Wallet className="w-4 h-4" />
                           </div>
                           <span className="text-xs font-bold text-muted uppercase tracking-widest">Liquid Assets</span>
                         </div>
                         <div className="text-2xl font-bold">$8,240</div>
                         <div className="text-[10px] text-muted font-bold mt-1">Ready for allocation</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Sidebar Section */}
                  <div className="col-span-4 space-y-6">
                    <div className="h-full bg-white/[0.02] rounded-[32px] border border-white/5 p-6 flex flex-col">
                       <div className="text-xs font-bold text-muted uppercase tracking-widest mb-6">Security Node</div>
                       <div className="flex-1 space-y-5">
                          {[
                            { label: "Vault Encryption", status: "Active", color: "text-emerald-400" },
                            { label: "AI Prediction", status: "Processing", color: "text-blue-400" },
                            { label: "Cloud Sync", status: "Synced", color: "text-emerald-400" }
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                               <span className="text-[11px] text-muted">{item.label}</span>
                               <span className={`text-[10px] font-bold ${item.color}`}>{item.status}</span>
                            </div>
                          ))}
                       </div>
                       <div className="mt-auto pt-6 border-t border-white/5">
                          <div className="h-20 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center justify-center gap-2">
                             <Shield className="w-6 h-6 text-primary" />
                             <span className="text-[10px] font-bold text-primary uppercase">Vault Protected</span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </motion.div>

      {/* Cinematic Demo Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl"
              onClick={() => setShowDemo(false)}
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-6xl aspect-video glass-premium rounded-[40px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden bg-slate-950"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowDemo(false)}
                className="absolute top-6 right-6 z-50 w-12 h-12 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all hover:rotate-90 backdrop-blur-md border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Motion Demo Player or User Video */}
              <div className="w-full h-full relative overflow-hidden group/video">
                {DEMO_VIDEO_URL ? (
                  <video 
                    src={DEMO_VIDEO_URL}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <DemoMotionTour />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * Cinematic Product Tour Component
 * Simulates a video demo with high-fidelity animated layers
 */
function DemoMotionTour() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const STEPS = [
    {
      title: "Real-Time Intelligence",
      description: "Monitor your global assets with bank-grade precision and AI-driven growth insights.",
      image: "https://images.unsplash.com/photo-1642104704074-907c0698bcd9?auto=format&fit=crop&q=80&w=2000", // Fallback high-end visual
      accent: "from-blue-500/20"
    },
    {
      title: "Deep Analytics",
      description: "Visualize every transaction. Understand your cash flow with predictive modeling.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000",
      accent: "from-purple-500/20"
    },
    {
      title: "Secure Vaulting",
      description: "Your data is protected by AES-256 encryption and multi-sig biometric verification.",
      image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=2000",
      accent: "from-emerald-500/20"
    }
  ];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {/* Background Image with Cinematic Overlay */}
          <img 
            src={STEPS[step].image} 
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            alt="Demo Visual"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${STEPS[step].accent} to-slate-950/90`} />
          <div className="absolute inset-0 bg-slate-950/40" />

          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="max-w-2xl"
            >
              <h3 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                {STEPS[step].title}
              </h3>
              <p className="text-lg md:text-xl text-white/60 leading-relaxed">
                {STEPS[step].description}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Bars (Player Style) */}
      <div className="absolute bottom-10 left-10 right-10 flex gap-3 z-20">
        {STEPS.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setStep(i)}
            className="flex-1 h-3 flex items-center group cursor-pointer focus:outline-none"
            aria-label={`Jump to step ${i + 1}`}
          >
            <div className="w-full h-1 bg-white/10 group-hover:bg-white/20 rounded-full overflow-hidden transition-colors">
              <motion.div
                initial={false}
                animate={{ 
                  width: step === i ? "100%" : step > i ? "100%" : "0%",
                  opacity: step === i ? 1 : 0.3
                }}
                transition={{ duration: step === i ? 5 : 0.5, ease: "linear" }}
                className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>
          </button>
        ))}
      </div>

      {/* Playback Controls Overlay */}
      <div className="absolute bottom-12 right-12 z-30 flex items-center gap-4">
         <button 
           onClick={() => setIsPaused(!isPaused)}
           className="w-10 h-10 rounded-full glass-premium border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
         >
           {isPaused ? <Play className="w-4 h-4 fill-white" /> : <div className="flex gap-1"><div className="w-1 h-3 bg-white" /><div className="w-1 h-3 bg-white" /></div>}
         </button>
         <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Step {step + 1} / {STEPS.length}</span>
      </div>
    </div>
  );
}



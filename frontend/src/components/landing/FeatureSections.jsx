import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { 
  Shield, Key, Coins, Activity, AlertTriangle, User, 
  Plus, Check, Lock, Unlock, ArrowRight, Play, Eye, Sparkles,
  RefreshCw
} from 'lucide-react';
import { fadeInUp, staggeredContainer } from '../../config/motion';
import { BRANDING } from '../../config/branding';

// Glow color configurations matching feature aesthetics
const GLOW_COLORS = {
  blue: 'rgba(59, 130, 246, 0.15)',
  emerald: 'rgba(16, 185, 129, 0.15)',
  purple: 'rgba(139, 92, 246, 0.15)',
  orange: 'rgba(249, 115, 22, 0.15)',
  pink: 'rgba(236, 72, 153, 0.15)',
  indigo: 'rgba(99, 102, 241, 0.15)'
};

/**
 * Reusable FeatureCard Component
 * Implements premium 3D spring tilt physics and cursor-tracking radial glows.
 */
function FeatureCard({ title, description, icon: Icon, colorClass, glowColor, children }) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for tilt coordinates
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Springs for smooth hardware-accelerated 3D movement
  const rotateX = useSpring(useTransform(y, [0, 1], [10, -10]), { damping: 20, stiffness: 130 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-10, 10]), { damping: 20, stiffness: 130 });
  const scale = useSpring(1, { damping: 20, stiffness: 130 });

  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Normalize coordinates [0, 1] for 3D tilt
    x.set(mouseX / rect.width);
    y.set(mouseY / rect.height);

    // Apply custom properties for the radial-glow background
    cardRef.current.style.setProperty('--mouse-x', `${mouseX}px`);
    cardRef.current.style.setProperty('--mouse-y', `${mouseY}px`);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.02);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
    scale.set(1);
  };

  // Safe checks: disable 3D transform layers on screens below lg (1024px)
  const isTouchDevice = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <motion.div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isTouchDevice ? 0 : rotateX,
        rotateY: isTouchDevice ? 0 : rotateY,
        scale,
        transformStyle: 'preserve-3d',
        '--glow-color': glowColor
      }}
      className="p-8 rounded-[36px] glass-premium border border-white/5 hover:border-white/12 transition-colors duration-500 group cursor-default relative overflow-hidden hover-glow-card flex flex-col justify-between h-[480px] bg-slate-950/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.5)]"
    >
      {/* 3D Depth Card Ambient Glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(350px_circle_at_var(--mouse-x,0px)_var(--mouse-y,0px),var(--glow-color),transparent_80%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
      />

      <div style={{ transform: isTouchDevice ? 'none' : 'translateZ(30px)' }} className="relative z-10">
        <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 border border-white/5`}>
          <Icon className={`w-7 h-7 ${colorClass}`} />
        </div>
        <h3 className="text-2xl font-bold mb-3 tracking-tight text-white">{title}</h3>
        <p className="text-muted leading-relaxed text-sm md:text-base">
          {description}
        </p>
      </div>

      {/* Embedded Feature Demonstration Widget */}
      <div 
        style={{ transform: isTouchDevice ? 'none' : 'translateZ(45px)' }} 
        className="relative z-10 w-full h-[180px] rounded-2xl overflow-hidden bg-slate-950/50 border border-white/5 p-4 flex flex-col justify-center select-none"
      >
        {children}
      </div>
    </motion.div>
  );
}

export default function FeatureSections() {
  // 1. Ledger integrity Shield Simulator
  const [shieldState, setShieldState] = useState('idle'); // 'idle', 'testing', 'blocked'
  const triggerShieldSim = () => {
    if (shieldState !== 'idle') return;
    setShieldState('testing');
    setTimeout(() => {
      setShieldState('blocked');
      setTimeout(() => {
        setShieldState('idle');
      }, 3000);
    }, 1200);
  };

  // 2. Recovery Vault Decrypter
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [vaultKey, setVaultKey] = useState('0x9F4B3C81A0726E');
  useEffect(() => {
    let interval;
    if (isDecrypted) {
      const chars = '0123456789ABCDEF';
      let ticks = 0;
      interval = setInterval(() => {
        if (ticks < 8) {
          setVaultKey(() => 
            Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
          );
          ticks++;
        } else {
          setVaultKey('NEXVAULT_SECURE_PASS_2026');
          clearInterval(interval);
        }
      }, 80);
    } else {
      setVaultKey('0x9F4B3C81A0726E');
    }
    return () => clearInterval(interval);
  }, [isDecrypted]);

  // 3. Shared Pools Allocator
  const [poolPercent, setPoolPercent] = useState(70);

  // 4. Chronological Ledger stream
  const [transactions, setTransactions] = useState([
    { id: 1, name: 'Salary Deposit', val: '+ $4,850.00', pos: true, time: '10:14 AM' },
    { id: 2, name: 'AWS Cloud Hosting', val: '- $182.40', pos: false, time: '09:30 AM' },
    { id: 3, name: 'Stripe Pay-out', val: '+ $950.00', pos: true, time: '08:15 AM' }
  ]);
  const addTransaction = () => {
    const names = ['App Store Purchase', 'Tesla Charging', 'Framer Subscription', 'Coffee Bean Cafe', 'Target Stores'];
    const charges = [14.99, 45.20, 20.00, 6.80, 84.15];
    const index = Math.floor(Math.random() * names.length);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTx = {
      id: Date.now(),
      name: names[index],
      val: `- $${charges[index].toFixed(2)}`,
      pos: false,
      time
    };
    setTransactions(prev => [newTx, ...prev.slice(0, 2)]);
  };

  // 5. Subscription optimizer
  const [subStatus, setSubStatus] = useState('alert'); // 'alert', 'canceled', 'approved'

  // 6. Tactile Cropper Zoom Simulator
  const [zoomLevel, setZoomLevel] = useState(1.2);
  const [dragOffset, setDragOffset] = useState({ x: -10, y: -5 });

  return (
    <section id="features" className="py-32 px-6 bg-[#0B1222] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-primary/5 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-black uppercase text-primary tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">The Ecosystem</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6"
          >
            Engineered for Total Control
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted max-w-2xl mx-auto text-base md:text-lg leading-relaxed"
          >
            Interact with our micro-simulators below to preview the exact, real-time banking safety shields, cryptographic structures, and ledger utilities running inside NexVault.
          </motion.p>
        </div>

        {/* 3D Features Grid */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggeredContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Card 1: Balance Shield */}
          <FeatureCard
            title="Ledger Integrity Shield"
            description="Protect your designated Safe Reserves dynamically against overdrawing. Simulate an unauthorized charge intercept below."
            icon={Shield}
            colorClass="text-emerald-400"
            glowColor={GLOW_COLORS.emerald}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center text-[11px] font-bold text-white/40 pb-2 border-b border-white/5">
                <span>SAFE RESERVE METRICS</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  SHIELD ACTIVE
                </span>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-xs text-white/70 font-semibold">Safe Reserve</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">$1,000.00</span>
                </div>
                
                <div className="relative overflow-hidden flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-xs text-white/70 font-semibold">Incoming Charge</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400">$350.00</span>
                    <span className="text-[10px] text-white/40 font-mono">Uber Eats</span>
                  </div>
                  {shieldState === 'testing' && (
                    <motion.div 
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
                      className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent pointer-events-none"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {shieldState === 'idle' && (
                  <button 
                    onClick={triggerShieldSim}
                    className="w-full h-8 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-100 cursor-pointer transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Simulate Block
                  </button>
                )}
                {shieldState === 'testing' && (
                  <div className="w-full h-8 bg-white/5 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Intercepting Charge...
                  </div>
                )}
                {shieldState === 'blocked' && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full h-8 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] font-black flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                    INTEGRITY INTERCEPT: RESERVES SECURED
                  </motion.div>
                )}
              </div>
            </div>
          </FeatureCard>

          {/* Card 2: AES-256 Recovery Vault */}
          <FeatureCard
            title="AES-256 Recovery Vault"
            description="Safeguard private credentials and system credentials behind robust crypt key matrices. Hover to unlock and decrypt key live."
            icon={Key}
            colorClass="text-blue-400"
            glowColor={GLOW_COLORS.blue}
          >
            <div className="flex flex-col h-full justify-between" onMouseEnter={() => setIsDecrypted(true)} onMouseLeave={() => setIsDecrypted(false)}>
              <div className="flex justify-between items-center text-[11px] font-bold text-white/40 pb-2 border-b border-white/5">
                <span>MILITARY-GRADE SECURITY LAYER</span>
                <span className={isDecrypted ? 'text-blue-400' : 'text-slate-400'}>
                  {isDecrypted ? 'DECRYPTING...' : 'ENCRYPTED'}
                </span>
              </div>

              <div className="my-auto py-3">
                <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex flex-col gap-2 font-mono relative overflow-hidden shadow-inner">
                  <div className="absolute top-1 right-2 text-[9px] text-white/20 select-none">AES-256-GCM</div>
                  <div className="text-[10px] text-slate-500 font-bold">RECOVERY_TOKEN:</div>
                  <div className={`text-xs select-all break-all tracking-wider ${isDecrypted ? 'text-blue-400 font-bold shadow-blue-500/10' : 'text-slate-400'}`}>
                    {vaultKey}
                  </div>
                </div>
              </div>

              <div className="flex justify-center items-center gap-2 text-xs font-bold text-white/50">
                {isDecrypted ? (
                  <motion.div 
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 text-blue-400"
                  >
                    <Unlock className="w-3.5 h-3.5 animate-pulse" />
                    Key Matched: Vault Unlocked
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-white/30" />
                    Hover Card to Reveal Key
                  </div>
                )}
              </div>
            </div>
          </FeatureCard>

          {/* Card 3: Shared Pools Allocator */}
          <FeatureCard
            title="Shared Credit Pools"
            description="Establish consolidated sub-limits for team members or family cards. Adjust the allocations dynamically below."
            icon={Coins}
            colorClass="text-purple-400"
            glowColor={GLOW_COLORS.purple}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center text-[11px] font-bold text-white/40 pb-2 border-b border-white/5">
                <span>ACTIVE POOL ALLOCATOR</span>
                <span className="text-purple-400 font-bold">$5,000 LIMIT</span>
              </div>

              <div className="space-y-4 py-3">
                <div className="flex justify-between text-xs font-bold text-white/80">
                  <span className="text-blue-400 flex items-center gap-1">
                    Mahesh: ${((poolPercent / 100) * 5000).toLocaleString()} ({poolPercent}%)
                  </span>
                  <span className="text-purple-400 flex items-center gap-1">
                    Emily: ${(((100 - poolPercent) / 100) * 5000).toLocaleString()} ({100 - poolPercent}%)
                  </span>
                </div>

                {/* Progress bar split */}
                <div className="h-4 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden flex relative">
                  <motion.div 
                    style={{ width: `${poolPercent}%` }} 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full transition-all duration-300"
                  />
                  <motion.div 
                    style={{ width: `${100 - poolPercent}%` }} 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-r-full transition-all duration-300"
                  />
                </div>

                {/* Interactive Slider Input */}
                <input 
                  type="range"
                  min="20"
                  max="80"
                  value={poolPercent}
                  onChange={(e) => setPoolPercent(Number(e.target.value))}
                  className="w-full accent-purple-500 bg-white/10 h-1 rounded-lg cursor-pointer focus:outline-none"
                />
              </div>

              <div className="flex justify-center gap-2">
                <button 
                  onClick={() => setPoolPercent(50)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all border ${poolPercent === 50 ? 'bg-purple-500/25 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/5 hover:border-white/12 text-white/50'}`}
                >
                  Split 50/50
                </button>
                <button 
                  onClick={() => setPoolPercent(70)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all border ${poolPercent === 70 ? 'bg-purple-500/25 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/5 hover:border-white/12 text-white/50'}`}
                >
                  Premium 70/30
                </button>
                <button 
                  onClick={() => setPoolPercent(80)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all border ${poolPercent === 80 ? 'bg-purple-500/25 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/5 hover:border-white/12 text-white/50'}`}
                >
                  Extreme 80/20
                </button>
              </div>
            </div>
          </FeatureCard>

          {/* Card 4: Chronological Ledger */}
          <FeatureCard
            title="Chronological Ledger Stream"
            description="Track real-time card deposits and withdrawals inside our multi-channel ledgers. Push interactive charges below."
            icon={Activity}
            colorClass="text-orange-400"
            glowColor={GLOW_COLORS.orange}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center text-[11px] font-bold text-white/40 pb-2 border-b border-white/5">
                <span>CHRONO LEDGER OPERATOR</span>
                <button 
                  onClick={addTransaction}
                  className="text-orange-400 hover:text-orange-300 font-black flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ADD ENTRY
                </button>
              </div>

              <div className="space-y-1.5 my-2 h-[100px] overflow-hidden flex flex-col justify-start relative">
                <AnimatePresence initial={false}>
                  {transactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: -15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-between items-center bg-white/5 p-1.5 px-3 rounded-lg border border-white/5 hover:border-white/12 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white/90">{tx.name}</span>
                        <span className="text-[9px] text-white/40">{tx.time}</span>
                      </div>
                      <span className={`text-xs font-mono font-black ${tx.pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.val}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="text-[10px] text-center text-white/30 italic">
                Active block audit log verified • cryptographic sync OK
              </div>
            </div>
          </FeatureCard>

          {/* Card 5: Subscription Optimizer */}
          <FeatureCard
            title="AI Subscription Optimizer"
            description="Find surging SaaS rates and duplicate invoices. Act upon active system anomalies instantly below."
            icon={AlertTriangle}
            colorClass="text-pink-400"
            glowColor={GLOW_COLORS.pink}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center text-[11px] font-bold text-white/40 pb-2 border-b border-white/5">
                <span>COST ANOMALY DETECTOR</span>
                <span className="text-pink-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                  ANOMALY INBOUND
                </span>
              </div>

              <div className="py-2 my-auto">
                <div className={`p-2.5 rounded-xl border transition-all duration-300 ${subStatus === 'alert' ? 'bg-rose-500/10 border-rose-500/20' : subStatus === 'canceled' ? 'bg-slate-900 border-white/10 opacity-70' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-white">Slack Premium Pro</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${subStatus === 'alert' ? 'bg-rose-500/20 text-rose-300' : subStatus === 'canceled' ? 'bg-white/5 text-white/40' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {subStatus === 'alert' ? 'Surged +25%' : subStatus === 'canceled' ? 'Canceled' : 'Approved'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted leading-relaxed">
                    {subStatus === 'alert' ? 'Monthly billing surged from $12.00 to $15.00/seat. No warning provided.' : subStatus === 'canceled' ? 'Billing cycle interrupted. Renewal cancel scheduled.' : 'Payment approved. Synced with balance reserves.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {subStatus === 'alert' ? (
                  <>
                    <button 
                      onClick={() => setSubStatus('canceled')}
                      className="w-1/2 h-8 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-1"
                    >
                      Cancel Renewal
                    </button>
                    <button 
                      onClick={() => setSubStatus('approved')}
                      className="w-1/2 h-8 glass-premium text-white hover:bg-white/5 rounded-lg text-[10px] font-black cursor-pointer transition-colors border border-white/10 active:scale-95 flex items-center justify-center gap-1"
                    >
                      Approve Pay
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSubStatus('alert')}
                    className="w-full h-8 bg-white/5 border border-white/10 hover:border-white/20 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
                  >
                    Reset Optimization Demo
                  </button>
                )}
              </div>
            </div>
          </FeatureCard>

          {/* Card 6: Tactile Cropper */}
          <FeatureCard
            title="Tactile Avatar Cropper"
            description="Fine-tune your dashboard profile picture seamlessly. Drag and scale the avatar preview using tactile slide-zoom."
            icon={User}
            colorClass="text-indigo-400"
            glowColor={GLOW_COLORS.indigo}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center text-[11px] font-bold text-white/40 pb-2 border-b border-white/5">
                <span>IDENTITY ALIGNER (CROP MASK)</span>
                <span className="text-indigo-400 font-bold">{zoomLevel.toFixed(1)}x ZOOM</span>
              </div>

              {/* Crop Box Frame */}
              <div className="my-auto h-[90px] w-full rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden relative">
                {/* Circular Crop Mask Guideline */}
                <div className="absolute w-[65px] h-[65px] rounded-full border-2 border-dashed border-indigo-400/60 z-20 pointer-events-none flex items-center justify-center">
                  <div className="w-[61px] h-[61px] rounded-full border border-indigo-500/10" />
                </div>
                
                {/* Simulated Portrait with Spring motion */}
                <motion.div 
                  animate={{ 
                    scale: zoomLevel,
                    x: dragOffset.x,
                    y: dragOffset.y
                  }}
                  drag
                  dragConstraints={{ left: -30, right: 30, top: -20, bottom: 20 }}
                  dragElastic={0.1}
                  onDrag={(e, info) => setDragOffset({ x: dragOffset.x + info.delta.x, y: dragOffset.y + info.delta.y })}
                  className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg relative cursor-move z-10"
                >
                  <User className="w-8 h-8 text-white" />
                  <div className="absolute inset-0 bg-white/10 rounded-2xl" />
                </motion.div>
                <div className="absolute bottom-1 right-2 text-[8px] text-white/30 z-20 pointer-events-none">DRAG DRAG</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-white/40 px-1 font-bold">
                  <span>SCALE: 1.0x</span>
                  <span>2.0x</span>
                </div>
                {/* Zoom Controller */}
                <input 
                  type="range"
                  min="1"
                  max="2"
                  step="0.1"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-white/10 h-1 rounded-lg cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </FeatureCard>
        </motion.div>

        {/* Feature Action Redirection */}
        <div className="text-center mt-16">
          <a 
            href="/signup" 
            className="inline-flex items-center gap-2 text-white hover:text-primary transition-colors text-sm md:text-base font-bold group"
          >
            Explore all security & limit mechanisms inside the dashboard
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}

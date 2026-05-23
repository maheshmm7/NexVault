import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Coins, Key, ArrowRight } from 'lucide-react';
import { BRANDING } from '../../config/branding';

export default function LandingCTA() {
  const navigate = useNavigate();
  
  // 3D Tilt Spring Variables
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [6, -6]), { damping: 25, stiffness: 150 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-6, 6]), { damping: 25, stiffness: 150 });
  const scale = useSpring(1, { damping: 25, stiffness: 150 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width);
    y.set(mouseY / rect.height);
    
    e.currentTarget.style.setProperty('--mouse-x', `${mouseX}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${mouseY}px`);
  };

  const handleMouseEnter = () => {
    scale.set(1.015);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
    scale.set(1);
  };

  return (
    <section className="py-32 px-6 relative overflow-hidden bg-[#0A1222]">
      {/* Cinematic Ambient Glow Point (Stationary background layers) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0" />

      {/* Floating Animated Backdrop Background Icons (Delightful Parallax) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[
          { icon: Shield, top: '15%', left: '10%', delay: 0, scale: 0.8, color: 'text-emerald-500/20' },
          { icon: Key, top: '25%', right: '12%', delay: 2, scale: 1.1, color: 'text-blue-500/20' },
          { icon: Sparkles, bottom: '20%', left: '15%', delay: 1.5, scale: 0.9, color: 'text-pink-500/20' },
          { icon: Coins, bottom: '25%', right: '18%', delay: 0.8, scale: 1.0, color: 'text-purple-500/20' }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ y: 0 }}
            animate={{ y: [0, -15, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: item.delay
            }}
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
              right: item.right,
              bottom: item.bottom,
              transform: `scale(${item.scale})`
            }}
            className={`hidden md:block ${item.color}`}
          >
            <item.icon className="w-10 h-10" />
          </motion.div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            scale,
            transformStyle: 'preserve-3d',
            '--glow-color': 'rgba(59, 130, 246, 0.08)'
          }}
          className="glass-premium p-12 md:p-20 rounded-[48px] border border-white/10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)] bg-slate-950/40 relative overflow-hidden hover-glow-card group cursor-default"
        >
          {/* Internal ambient tracking pointer glow inside card */}
          <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(400px_circle_at_var(--mouse-x,0px)_var(--mouse-y,0px),rgba(59,130,246,0.12),transparent_80%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Subtle neon glowing card trim */}
          <div className="absolute inset-0 border border-transparent rounded-[48px] bg-gradient-to-r from-primary/20 via-emerald-500/10 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0" />

          <div style={{ transform: 'translateZ(30px)' }} className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-indicator-pulse" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Beta Portal Open</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-white leading-[1.1] animate-shimmer-text">
              Ready to Take <br className="hidden sm:block" />
              Total Financial Control?
            </h2>
            
            <p className="text-base md:text-lg text-muted mb-12 max-w-xl mx-auto leading-relaxed">
              Join thousands of users tracking wealth chronologically, generating cryptographic vaults, and consolidating card limit pools under {BRANDING.NAME}. Build smarter habits today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <button 
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-8 h-14 bg-white text-slate-900 rounded-2xl font-bold text-base hover:bg-slate-100 transition-all shadow-[0_15px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_20px_45px_rgba(59,130,246,0.3)] active:scale-95 cursor-pointer flex items-center justify-center gap-2 group-hover:scale-[1.02] duration-200"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 h-14 glass-premium text-white rounded-2xl font-bold text-base hover:bg-white/5 transition-all active:scale-95 border border-white/10 hover:border-white/20 cursor-pointer flex items-center justify-center"
              >
                Sign In
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

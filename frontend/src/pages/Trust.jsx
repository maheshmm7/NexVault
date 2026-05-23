import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Layers, 
  ArrowLeft,
  Mail,
  Cpu
} from 'lucide-react';
import SupportPageContainer from '../components/SupportPageContainer';

export default function Trust() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const trustCards = [
    {
      icon: Lock,
      title: 'AES-256-GCM Vault Encryption',
      subtitle: 'Authenticated encryption protecting your sensitive credentials at rest.',
      badge: 'AES-256-GCM / 12-Byte IV',
      description: 'Sensitive vault data is encrypted at rest using AES-256-GCM and protected through secure backend access controls. GCM (Galois/Counter Mode) guarantees both confidentiality and authenticity, ensuring encrypted payloads cannot be manipulated or swapped post-facto. Each item utilizes a cryptographically secure, randomized 12-byte initialization vector (nonce) to prevent cipher duplication.'
    },
    {
      icon: ShieldCheck,
      title: 'Data Ownership & Boundaries',
      subtitle: 'Shielding credentials through rigorous access parameters.',
      badge: 'Access-Control Paradigm',
      description: 'We reject misleading zero-knowledge marketing claims. NexVault stores your credentials encrypted at rest on isolated, enterprise-grade storage databases. Access is heavily regulated by strict backend permissions, automated authorization checks, and multi-factor validation flows. Your data belongs entirely to your account and is accessible only to verified sessions.'
    },
    {
      icon: Key,
      title: 'Session & Authentication Security',
      subtitle: 'Guarding active dashboards against hijacking and unauthorized writes.',
      badge: 'HttpOnly JWT / CSRF Shield',
      description: 'Active dashboard sessions are fortified using robust security practices. We utilize HttpOnly JSON Web Tokens (JWT) to shield sessions from cross-site scripting (XSS) vectors. Our systems enforce automated session timeouts, localized token validation, and cross-site request forgery (CSRF) defenses to protect state changes.'
    },
    {
      icon: Layers,
      title: 'Operational & Isolation Controls',
      subtitle: 'Fintech-grade deployment hygiene and codebase testing.',
      badge: 'Domain Isolation Logic',
      description: 'NexVault employs modern continuous integration and security linting to detect structural vulnerabilities before deployment. Our codebase is isolated into distinct operational layers—separating presentation grids, financial calculators, and encryption engines—preventing scope creep and guaranteeing architectural safety.'
    }
  ];

  return (
    <SupportPageContainer
      activePage="trust"
      pageTitle="Trust Center"
    >

      {/* Hero Header Section */}
      <section className="relative z-10 py-20 px-6 text-center space-y-6 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-premium border border-white/10 mb-2"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-450" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-450">
            NexVault Security & Trust
          </span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight"
        >
          Trust Built on <br />
          <span className="animate-shimmer-text text-cinematic-gradient">Absolute Transparency</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed font-medium"
        >
          NexVault is engineered to protect user credentials, secure digital assets, and validate transactional histories with institutional seriousness.
        </motion.p>
      </section>

      {/* Trust Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trustCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-8 rounded-3xl bg-slate-900/20 border border-white/5 hover:border-white/10 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(16,185,129,0.05)] flex flex-col justify-between glass-premium group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-transform duration-350 group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                      {card.badge}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">{card.title}</h3>
                    <p className="text-xs text-slate-450 font-semibold leading-normal">{card.subtitle}</p>
                  </div>
                  <p className="text-xs md:text-sm text-slate-350 leading-relaxed pt-2">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Security Disclosure & Contact Terminal */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-28">
        <div className="p-8 md:p-10 rounded-3xl bg-[#070b14]/65 border border-white/5 text-center space-y-6 glass-premium shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.08)]">
            <Mail className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">Responsible Bug Bounty Disclosure</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
              We highly value the security research community. If you discover a vulnerability or security drift inside NexVault, please disclose it responsibly.
            </p>
          </div>

          {/* Cyber Terminal block */}
          <div className="max-w-md mx-auto rounded-2xl border border-white/5 bg-[#030712] text-left font-mono text-xs text-slate-400 overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-white/5">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500/50" />
                <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
              </div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-emerald-500" /> nexvault-soc.sh
              </span>
              <div className="w-10" />
            </div>
            <div className="p-5 space-y-2 text-[11px] leading-relaxed">
              <p className="text-slate-650"># SECURITY OPERATIONS CENTER DECRYPTION INSTRUCTIONS</p>
              <div className="flex gap-4">
                <span className="text-slate-600 select-none">01</span>
                <span><span className="text-emerald-400">CONTACT_CHANNEL</span>="<a href="mailto:security@nexvault.io" className="text-cyan-400 hover:underline">security@nexvault.io</a>"</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 select-none">02</span>
                <span><span className="text-emerald-400">PGP_FINGERPRINT</span>="<span className="text-slate-350">8F9D E3A1 B0E8 9F6C 7A2B 3E9D 4F1C 0B5E</span>"</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 select-none">03</span>
                <span><span className="text-emerald-400">SLA_RESPONSE_TIME</span>="<span className="text-slate-350">Within 24 Hours</span>"</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 select-none">04</span>
                <span><span className="text-emerald-400">REPORT_CRITERIA</span>="<span className="text-slate-350">Steps to reproduce + POC payload</span>"</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
            All submitted security reports are handled with high priority, verified by our staff, and addressed through transparent remediation cycles.
          </p>
        </div>
      </section>
    </SupportPageContainer>
  );
}

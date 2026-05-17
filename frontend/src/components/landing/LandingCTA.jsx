import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BRANDING } from '../../config/branding';

export default function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[140px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10 glass-premium p-12 md:p-20 rounded-[48px] border border-white/10 text-center shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">
            Ready to Take <br />
            <span className="text-blue-400">Total Control?</span>
          </h2>
          <p className="text-xl text-muted mb-12 max-w-xl mx-auto">
            Join thousands of users managing their financial future with 
            NEXVAULT. Build smarter habits today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 rounded-2xl font-bold text-xl hover:bg-slate-100 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.15)] active:scale-95"
            >
              Create Free Account
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-10 py-5 glass-premium text-white rounded-2xl font-bold text-xl hover:bg-white/5 transition-all active:scale-95 border border-white/10"
            >
              Sign In
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

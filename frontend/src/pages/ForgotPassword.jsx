import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-primary selection:text-white flex flex-col relative overflow-hidden">
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cinematic-grid opacity-20" />
        <div className="absolute inset-0 bg-cinematic-gradient" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 px-6 py-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo size={32} showText={true} textClass="text-2xl" />
        </Link>
        <Link 
          to="/login" 
          className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10 pb-20">
        <motion.div 
          variants={staggeredContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <motion.div 
            variants={fadeInUp}
            className="glass-premium p-8 md:p-10 rounded-[32px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] bg-slate-900/40"
          >
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 text-success border border-success/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-4">Check Your Email</h1>
                <p className="text-muted text-sm leading-relaxed mb-6">
                  If your email is registered in our secure database, you will receive a password reset link shortly.
                </p>

                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center mb-6">
                  <p className="text-xs text-muted leading-relaxed">
                    Having trouble receiving reset emails?<br />
                    NEXVAULT is currently in beta testing.<br />
                    Please contact support for password recovery assistance.
                  </p>
                </div>

                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">Reset Password</h1>
                  <p className="text-muted text-sm">Enter your email and we'll send a secure reset link</p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl mb-8 text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                      placeholder="name@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending secure link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                <div className="mt-10 text-center text-sm text-muted space-y-3">
                  <div>
                    Remember your credentials? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    Lost email access? <Link to="/recover-account" className="text-primary font-bold hover:underline">Recover Using Recovery Code</Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* Subtle Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}

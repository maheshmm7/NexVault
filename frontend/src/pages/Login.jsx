import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, ShieldAlert } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';
import AuthCarousel from '../components/AuthCarousel';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [capsLockActive, setCapsLockActive] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong');
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
      <header className="relative z-20 px-6 py-6 md:py-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo size={32} showText={true} textClass="text-2xl font-black" />
        </Link>
        <Link 
          to="/" 
          className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10 pb-20">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Cinematic Visual Benefits Carousel (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-6 relative">
            <AuthCarousel />
          </div>

          {/* Right Column: High-Fidelity Glassmorphic Login Form */}
          <div className="col-span-1 lg:col-span-6 flex justify-center">
            <motion.div 
              variants={staggeredContainer}
              initial="hidden"
              animate="visible"
              className="w-full max-w-md"
            >
              <motion.div 
                variants={fadeInUp}
                className="glass-premium p-8 md:p-10 rounded-[32px] border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] bg-slate-900/40 relative overflow-hidden"
              >
                {/* Floating ambient glow point inside form */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 blur-2xl rounded-full pointer-events-none" />

                <div className="text-center mb-10">
                  <h1 className="text-3xl font-black tracking-tight mb-2 text-white animate-shimmer-text">Welcome Back</h1>
                  <p className="text-muted text-xs font-medium uppercase tracking-wider">Log in to your secure account</p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-danger/10 border border-danger/20 text-danger px-4 py-3.5 rounded-2xl mb-8 text-xs font-semibold flex items-center gap-2.5"
                  >
                    <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-2 ml-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full h-13 bg-white/5 border border-white/10 rounded-2xl px-5 outline-none transition-all placeholder:text-white/20 input-glow-focus text-sm"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2 ml-1 relative">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">Password</label>
                      
                      {/* Interactive Caps-Lock Active Alert */}
                      {capsLockActive && (
                        <span className="absolute right-24 text-[9px] text-orange-400 font-bold uppercase tracking-widest animate-pulse">
                          ⚠️ Caps Lock On
                        </span>
                      )}

                      <Link to="/forgot-password" className="text-[10px] font-bold text-primary hover:text-blue-400 transition-colors">
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-13 bg-white/5 border border-white/10 rounded-2xl px-5 pr-14 outline-none transition-all placeholder:text-white/20 input-glow-focus text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-5 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full h-13 bg-primary text-white rounded-2xl font-bold text-base hover:shadow-[0_0_35px_rgba(59,130,246,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                  >
                    Sign In
                  </button>
                </form>

                <div className="mt-8 text-center text-xs font-bold text-muted uppercase tracking-wider">
                  Don't have an account? <Link to="/signup" className="text-primary font-extrabold hover:text-blue-400 transition-colors ml-1">Create Account</Link>
                </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* Subtle Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}



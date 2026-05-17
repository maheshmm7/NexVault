import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
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
          to="/" 
          className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
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
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight mb-3">Welcome Back</h1>
              <p className="text-muted text-sm">Log in to your NEXVAULT account</p>
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
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">Password</label>
                  <Link to="#" className="text-xs font-bold text-primary hover:text-blue-400 transition-colors">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 pr-14 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Sign In
              </button>
            </form>

            <div className="mt-10 text-center text-sm text-muted">
              Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Create Account</Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Subtle Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}


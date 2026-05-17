import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';

export default function Signup() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      await signup(formData.full_name, formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
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
          className="w-full max-w-5xl flex flex-col lg:flex-row gap-16 items-center"
        >
          {/* Visual Side (Desktop only) */}
          <div className="hidden lg:block flex-1">
            <motion.div variants={fadeInUp}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                Start your journey to <br />
                <span className="text-primary text-cinematic-gradient">Financial Intelligence</span>
              </h2>
              <div className="space-y-6">
                {[
                  "Instant Analytics & AI Insights",
                  "Bank-grade AES-256 Security Vault",
                  "Seamless Multi-account Synchronization",
                  "Automated Subscription Tracking"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-muted font-medium text-lg">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div 
            variants={fadeInUp}
            className="w-full max-w-md glass-premium p-8 md:p-10 rounded-[32px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] bg-slate-900/40"
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight mb-3">Create Account</h1>
              <p className="text-muted text-sm">Join {BRANDING.NAME} for free today</p>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                  placeholder="name@example.com"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Confirm</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-1 pb-4">
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-bold text-muted hover:text-white transition-colors"
                >
                  {showPassword ? "Hide Passwords" : "Show Passwords"}
                </button>
              </div>

              <button 
                type="submit" 
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Get Started
              </button>
            </form>

            <div className="mt-10 text-center text-sm text-muted">
              Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Subtle Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';
import api from '../services/api';

export default function ResetPassword() {
  const [formData, setFormData] = useState({
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const { token } = useParams();
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

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: formData.password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong. The link might be expired.');
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
                <h1 className="text-2xl font-bold tracking-tight mb-4">Password Restored</h1>
                <p className="text-muted text-sm leading-relaxed mb-8">
                  Your new credentials have been safely committed. You can now securely sign in to your wallet.
                </p>
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">New Password</h1>
                  <p className="text-muted text-sm">Please secure your account with a strong password</p>
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 pr-14 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                        placeholder="••••••••"
                        required
                        disabled={loading}
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

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                      placeholder="••••••••"
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
                        Committing new credentials...
                      </>
                    ) : (
                      'Commit New Password'
                    )}
                  </button>
                </form>
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

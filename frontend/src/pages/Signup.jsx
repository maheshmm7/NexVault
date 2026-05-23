import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft, Shield, Eye, EyeOff, Check, Copy, Download, ShieldAlert } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';
import PasswordFeedback from '../components/PasswordFeedback';
import AuthCarousel from '../components/AuthCarousel';

const extractErrorMessage = (err) => {
  const data = err.response?.data;
  if (!data) return 'Something went wrong';
  
  if (data.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail.map(e => {
        const field = e.loc ? e.loc[e.loc.length - 1] : '';
        const fieldName = field ? field.replace('_', ' ').toUpperCase() : '';
        return `${fieldName ? fieldName + ': ' : ''}${e.msg}`;
      }).join(', ');
    }
    return data.detail;
  }
  
  return data.message || 'Something went wrong';
};

export default function Signup() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isSavedChecked, setIsSavedChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const { signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Set up global caps lock listener
  useEffect(() => {
    const handleModifierState = (e) => {
      if (e.getModifierState) {
        setCapsLockActive(e.getModifierState('CapsLock'));
      }
    };
    window.addEventListener('keydown', handleModifierState);
    window.addEventListener('keyup', handleModifierState);
    return () => {
      window.removeEventListener('keydown', handleModifierState);
      window.removeEventListener('keyup', handleModifierState);
    };
  }, []);

  // Reset copied state after timeout
  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

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
      const res = await signup(formData.email, formData.password, formData.full_name);
      if (res && res.recovery_code) {
        setRecoveryCode(res.recovery_code);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
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

          {/* Right Column: High-Fidelity Glassmorphic Signup Form */}
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
                  <h1 className="text-3xl font-black tracking-tight mb-2 text-white animate-shimmer-text">Create Account</h1>
                  <p className="text-muted text-xs font-medium uppercase tracking-wider">Join {BRANDING.NAME} for free today</p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-danger/10 border border-danger/20 text-danger px-4 py-3.5 rounded-2xl mb-8 text-xs font-semibold flex items-center gap-2.5 animate-fade-in"
                  >
                    <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Full Name */}
                  <div className="relative">
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder=" "
                      required
                      className="peer w-full h-13 bg-white/5 border border-white/10 rounded-2xl px-5 pt-5 pb-1 outline-none transition-all placeholder:text-transparent input-glow-focus text-sm text-white"
                    />
                    <label className="absolute left-5 top-2 text-[9px] font-bold text-muted uppercase tracking-widest transition-all duration-200 pointer-events-none origin-left
                      peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:text-white/20
                      peer-focus:top-2 peer-focus:text-[9px] peer-focus:text-primary"
                    >
                      Full Name
                    </label>
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder=" "
                      required
                      className="peer w-full h-13 bg-white/5 border border-white/10 rounded-2xl px-5 pt-5 pb-1 outline-none transition-all placeholder:text-transparent input-glow-focus text-sm text-white"
                    />
                    <label className="absolute left-5 top-2 text-[9px] font-bold text-muted uppercase tracking-widest transition-all duration-200 pointer-events-none origin-left
                      peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:text-white/20
                      peer-focus:top-2 peer-focus:text-[9px] peer-focus:text-primary"
                    >
                      Email Address
                    </label>
                  </div>
                  
                  {/* Passwords Column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder=" "
                        required
                        className="peer w-full h-13 bg-white/5 border border-white/10 rounded-2xl px-5 pr-11 pt-5 pb-1 outline-none transition-all placeholder:text-transparent input-glow-focus text-sm text-white"
                      />
                      <label className="absolute left-5 top-2 text-[9px] font-bold text-muted uppercase tracking-widest transition-all duration-200 pointer-events-none origin-left
                        peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:text-white/20
                        peer-focus:top-2 peer-focus:text-[9px] peer-focus:text-primary"
                      >
                        Password
                      </label>
                      
                      {capsLockActive && (
                        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[8px] text-orange-400 font-bold uppercase tracking-widest animate-pulse pointer-events-none select-none z-10 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                          Caps
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none cursor-pointer z-10"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder=" "
                        required
                        className="peer w-full h-13 bg-white/5 border border-white/10 rounded-2xl px-5 pr-11 pt-5 pb-1 outline-none transition-all placeholder:text-transparent input-glow-focus text-sm text-white"
                      />
                      <label className="absolute left-5 top-2 text-[9px] font-bold text-muted uppercase tracking-widest transition-all duration-200 pointer-events-none origin-left
                        peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:text-white/20
                        peer-focus:top-2 peer-focus:text-[9px] peer-focus:text-primary"
                      >
                        Confirm
                      </label>

                      {capsLockActive && (
                        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[8px] text-orange-400 font-bold uppercase tracking-widest animate-pulse pointer-events-none select-none z-10 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                          Caps
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none cursor-pointer z-10"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Real-time Password Strength Meter */}
                  <PasswordFeedback 
                    password={formData.password} 
                    confirmPassword={formData.confirm_password} 
                  />

                  <button 
                    type="submit" 
                    className="w-full h-13 bg-primary text-white rounded-2xl font-bold text-base hover:shadow-[0_0_35px_rgba(59,130,246,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center mt-6"
                  >
                    Create Account
                  </button>
                </form>

                <div className="mt-8 text-center text-xs font-bold text-muted uppercase tracking-wider">
                  Already have an account? <Link to="/login" className="text-primary font-extrabold hover:text-blue-400 transition-colors ml-1">Sign In</Link>
                </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* Subtle Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Save Recovery Code Modal with AnimatePresence */}
      <AnimatePresence>
        {recoveryCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg glass-premium p-8 md:p-10 rounded-[32px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-slate-900/60 relative overflow-hidden"
            >
              {/* Decorative radial blur light inside modal */}
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20">
                <Shield className="w-8 h-8 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight text-white mb-3">Save Your Recovery Code</h2>
              
              <p className="text-xs text-muted leading-relaxed max-w-md mx-auto mb-6">
                This recovery code can be used to reset your password if you lose access to email recovery. Store it safely and never share it.
              </p>
              
              {/* Monospace Cryptographic Code Display Box */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-6 mb-8 relative group overflow-hidden shadow-inner">
                {/* Shifting radial glow background inside code container */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Secure Cryptographic Key</span>
                  <span className="text-[8px] font-bold text-muted uppercase">AES-256 System-Generated</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xl md:text-2xl font-black text-white tracking-widest block select-all break-all text-left">
                    {recoveryCode}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(recoveryCode);
                      addToast("Recovery code copied securely", "success");
                      setCopied(true);
                    }}
                    className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/10 transition-all text-primary hover:text-white shrink-0 shadow-sm relative cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Actions: Download */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    const element = document.createElement("a");
                    const fileContent = `NEXVAULT RECOVERY CODE\n======================\n\nCode: ${recoveryCode}\n\nWARNING:\nStore this recovery code securely.\nAnyone with access to this code can reset your NEXVAULT account password.`;
                    const file = new Blob([fileContent], {type: 'text/plain'});
                    element.href = URL.createObjectURL(file);
                    element.download = "nexvault-recovery-code.txt";
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                    addToast("Recovery code TXT saved securely", "success");
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-white cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Recovery Backup (TXT)
                </button>
              </div>
              
              {/* Mandatory Save Confirmation Checkbox (Tactile Group) */}
              <div 
                onClick={() => setIsSavedChecked(!isSavedChecked)}
                className="flex items-start gap-3.5 text-left p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all mb-8 cursor-pointer select-none group"
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
                  isSavedChecked 
                    ? 'bg-primary border-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                    : 'border-white/20 group-hover:border-white/40 bg-black/40'
                }`}>
                  {isSavedChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>
                <span className="text-xs text-muted group-hover:text-white/80 transition-colors leading-relaxed">
                  I have securely saved my recovery code. I understand it cannot be recovered or shown again.
                </span>
              </div>
              
              {/* Continue Button */}
              <button
                type="button"
                disabled={!isSavedChecked}
                onClick={() => navigate('/dashboard')}
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_35px_rgba(59,130,246,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none cursor-pointer"
              >
                Continue to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
import { BRANDING } from '../config/branding';
import { fadeInUp, staggeredContainer } from '../config/motion';
import Logo from '../components/Logo';
import api from '../services/api';
import PasswordFeedback from '../components/PasswordFeedback';
import { useToast } from '../contexts/ToastContext';

export default function RecoverAccount() {
  const [formData, setFormData] = useState({
    email: '',
    recoveryCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState('');
  const [isSavedChecked, setIsSavedChecked] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

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
    setLoading(true);
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/recover-account', {
        email: formData.email.trim(),
        recovery_code: formData.recoveryCode.trim(),
        new_password: formData.newPassword,
      });

      if (response.data && response.data.new_recovery_code) {
        setSuccessCode(response.data.new_recovery_code);
      } else {
        addToast("Account recovered successfully! You can now log in.", "success");
        navigate('/login');
      }
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
          to="/forgot-password" 
          className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Forgot Password
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-3">Recover Account</h1>
              <p className="text-muted text-sm">Enter your recovery code and new credentials below</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl mb-6 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Recovery Code</label>
                <div className="relative">
                  <input
                    type={showRecoveryCode ? 'text' : 'password'}
                    name="recoveryCode"
                    value={formData.recoveryCode}
                    onChange={handleChange}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-5 pr-12 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20 font-mono tracking-wider uppercase"
                    placeholder="NVX-XXXX-XXXX-XXXX"
                    required
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryCode(!showRecoveryCode)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors cursor-pointer"
                  >
                    {showRecoveryCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2 ml-1">Confirm</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <PasswordFeedback 
                password={formData.newPassword} 
                confirmPassword={formData.confirmPassword} 
              />

              <div className="flex items-center gap-2 ml-1 pb-2">
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
                disabled={loading}
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recovering Account...
                  </>
                ) : (
                  'Recover Account'
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-muted">
              Remember your credentials? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* SUCCESS MODAL FOR THE NEW REGENERATED RECOVERY CODE */}
      {successCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-center">
          <div className="w-full max-w-lg glass-premium p-8 md:p-10 rounded-[32px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-slate-900/60 relative">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-main mb-3">New Recovery Code Generated</h2>
            
            <p className="text-xs text-muted leading-relaxed max-w-md mx-auto mb-6">
              Your account has been successfully recovered. A new recovery code has been generated. The old recovery code is now invalid. Please save this code securely.
            </p>
            
            {/* Monospace Code Display Box */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 mb-6 relative group overflow-hidden">
              <span className="font-mono text-xl md:text-2xl font-bold text-primary tracking-widest block select-all">
                {successCode}
              </span>
            </div>
            
            {/* Actions: Copy & Download */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(successCode);
                  addToast("New recovery code copied securely", "success");
                }}
                className="px-4 py-3 rounded-xl text-xs font-bold border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-main cursor-pointer"
              >
                Copy Code
              </button>
              <button
                type="button"
                onClick={() => {
                  const element = document.createElement("a");
                  const fileContent = `NEXVAULT RECOVERY CODE\n======================\n\nCode: ${successCode}\n\nWARNING:\nStore this recovery code securely.\nAnyone with access to this code can reset your NEXVAULT account password.`;
                  const file = new Blob([fileContent], {type: 'text/plain'});
                  element.href = URL.createObjectURL(file);
                  element.download = "nexvault-recovery-code.txt";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  addToast("Recovery code TXT saved securely", "success");
                }}
                className="px-4 py-3 rounded-xl text-xs font-bold border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-main cursor-pointer"
              >
                Download TXT
              </button>
            </div>
            
            {/* Mandatory Save Confirmation Checkbox */}
            <div className="flex items-start gap-3 text-left p-4 rounded-xl border border-white/5 bg-white/[0.01] mb-6">
              <input
                type="checkbox"
                id="confirmSuccessSaved"
                checked={isSavedChecked}
                onChange={(e) => setIsSavedChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20 accent-primary cursor-pointer animate-fade-in"
              />
              <label htmlFor="confirmSuccessSaved" className="text-xs text-muted leading-relaxed cursor-pointer select-none">
                I have securely saved my new recovery code. I understand it cannot be recovered or shown again.
              </label>
            </div>
            
            {/* Continue to Login Button */}
            <button
              type="button"
              disabled={!isSavedChecked}
              onClick={() => navigate('/login')}
              className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      )}

      {/* Subtle Bottom Glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}

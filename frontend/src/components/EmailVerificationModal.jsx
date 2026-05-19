import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import Modal from './Modal';
import { Mail, ShieldCheck, RefreshCw } from 'lucide-react';

export default function EmailVerificationModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);

  const inputRefs = useRef([]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, val) => {
    if (isNaN(Number(val)) && val !== '') return;
    const newCode = [...code];
    newCode[index] = val.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (val !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    
    // Focus last or next input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      addToast('Please enter the full 6-digit code', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users/me/verify-email', { code: fullCode });
      addToast('Email verified successfully!', 'success');
      await refreshUser();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Verification failed. Please check the code.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      await api.post('/users/me/resend-verification');
      addToast('A new verification code has been sent to your email.', 'success');
      setTimer(60); // 60 seconds cooldown
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to resend code.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify Your Email">
      <div className="flex flex-col items-center text-center space-y-5 p-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
          <Mail size={32} />
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            We sent a 6-digit verification code to <span className="text-white font-semibold">{user?.email}</span>.
          </p>
          <p className="text-xs text-muted">
            The code expires in 15 minutes.
          </p>
        </div>

        {/* 6-Digit input boxes */}
        <div className="flex justify-center gap-3 my-4">
          {code.map((num, i) => (
            <input
              key={i}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              ref={el => inputRefs.current[i] = el}
              value={num}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-white/10 bg-white/[0.02] text-white focus:border-primary focus:bg-primary/[0.02] focus:outline-none transition-all"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={submitting}
          className="btn-primary w-full py-3 text-sm font-semibold rounded-xl"
        >
          {submitting ? 'Verifying...' : 'Verify Email'}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="text-muted">Didn't receive the code?</span>
          <button
            onClick={handleResend}
            disabled={resending || timer > 0}
            className={`font-semibold transition-colors flex items-center gap-1 ${
              timer > 0 || resending 
                ? 'text-muted cursor-not-allowed' 
                : 'text-primary hover:text-primary-hover'
            }`}
          >
            {resending ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : timer > 0 ? (
              `Resend in ${timer}s`
            ) : (
              'Resend Code'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

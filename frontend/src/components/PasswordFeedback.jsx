import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export default function PasswordFeedback({ password = '', confirmPassword = null }) {
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const handleModifierState = (e) => {
      if (e.getModifierState) {
        setCapsLock(e.getModifierState('CapsLock'));
      }
    };
    window.addEventListener('keydown', handleModifierState);
    window.addEventListener('keyup', handleModifierState);
    return () => {
      window.removeEventListener('keydown', handleModifierState);
      window.removeEventListener('keyup', handleModifierState);
    };
  }, []);

  if (!password) return null;

  const criteria = [
    { label: '8+ Characters', met: password.length >= 8 },
    { label: 'Uppercase Letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase Letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special Character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  // Helper to check for sequential patterns (e.g. "abcd", "1234")
  const hasSequentialPattern = (str) => {
    const lower = str.toLowerCase();
    for (let i = 0; i < lower.length - 3; i++) {
      const c1 = lower.charCodeAt(i);
      const c2 = lower.charCodeAt(i + 1);
      const c3 = lower.charCodeAt(i + 2);
      const c4 = lower.charCodeAt(i + 3);
      if (c2 === c1 + 1 && c3 === c2 + 1 && c4 === c3 + 1) {
        return true;
      }
    }
    return false;
  };

  const isRepetitive = /(.)\1{3,}/.test(password); // 4+ repetitive characters (e.g. AAAA, 1111)
  const isSequential = hasSequentialPattern(password);
  const isPenalized = isRepetitive || isSequential;

  const metCount = criteria.filter((c) => c.met).length;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  let strengthTextColor = 'text-red-400';
  let StrengthIcon = AlertCircle;
  let barWidth = '33.3%';

  if (metCount >= 5 && !isPenalized) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthTextColor = 'text-emerald-400';
    StrengthIcon = ShieldCheck;
    barWidth = '100%';
  } else if (metCount >= 3) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-amber-500';
    strengthTextColor = 'text-amber-400';
    StrengthIcon = AlertTriangle;
    barWidth = '66.6%';
  }

  const isMatched = confirmPassword !== null ? password === confirmPassword : null;

  return (
    <div className="mt-3 space-y-3 p-4 rounded-2xl border border-white/5 bg-white/[0.015] animate-fade-in text-left">
      {/* Caps Lock Warning */}
      {capsLock && (
        <div className="text-xs text-amber-500 font-semibold flex items-center gap-1.5 animate-pulse mb-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          Caps Lock is ON
        </div>
      )}

      {/* Strength Indicator */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Strength</span>
          <div className={`flex items-center gap-1.5 text-xs font-bold ${strengthTextColor}`}>
            <StrengthIcon className="w-4 h-4 shrink-0" />
            <span>{strengthLabel}</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${strengthColor} transition-all duration-500 ease-out`} 
            style={{ width: barWidth }} 
          />
        </div>
      </div>

      {/* Penalized Warning Details */}
      {isPenalized && (
        <div className="text-[11px] text-amber-400/90 font-medium bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Strength capped due to repetitive or sequential characters.</span>
        </div>
      )}

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {c.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500/40 shrink-0" />
            )}
            <span className={c.met ? 'text-slate-200 font-medium' : 'text-slate-400'}>{c.label}</span>
          </div>
        ))}

        {/* Passwords Match Check */}
        {confirmPassword !== null && (
          <div className="flex items-center gap-2 text-xs sm:col-span-2 pt-2 border-t border-white/5 mt-1.5">
            {isMatched ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-semibold">Passwords Match</span>
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-red-400 font-semibold">Passwords Do Not Match</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

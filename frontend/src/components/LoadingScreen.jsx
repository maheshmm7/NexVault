import React from 'react';
import Logo from './Logo';

/**
 * Branded NEXVAULT Loading Experience
 * Supports multiple variants for different UI contexts.
 * 
 * @param {string} variant - 'full' | 'compact' | 'inline' | 'overlay'
 */
export const LoadingScreen = ({ variant = 'full', message = '' }) => {
  const containerClasses = {
    full: 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background',
    overlay: 'absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
    compact: 'flex flex-col items-center justify-center p-8 w-full',
    inline: 'flex items-center gap-3 py-2',
  };

  const logoSize = {
    full: 64,
    overlay: 48,
    compact: 32,
    inline: 20,
  };

  if (variant === 'inline') {
    return (
      <div className={containerClasses.inline}>
        <div className="animate-pulse">
          <Logo size={logoSize.inline} color="var(--primary)" />
        </div>
        {message && <span className="text-sm font-medium text-muted">{message}</span>}
      </div>
    );
  }

  return (
    <div className={containerClasses[variant]}>
      <div className="relative flex flex-col items-center">
        {/* Animated Glow Backdrop */}
        {(variant === 'full' || variant === 'overlay') && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 blur-3xl rounded-full animate-pulse" />
        )}
        
        {/* The Animated Brand Mark */}
        <div className="relative animate-bounce-slow">
          <div className="animate-pulse-subtle">
            <Logo 
              size={logoSize[variant]} 
              color="var(--primary)" 
              className="drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            />
          </div>
        </div>

        {/* Loading Progress Text */}
        {(message || variant === 'full') && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="text-sm font-bold tracking-[0.2em] text-primary uppercase opacity-80">
              {message || 'Initializing'}
            </span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Branding for full page */}
      {variant === 'full' && (
        <div className="absolute bottom-10 flex flex-col items-center gap-1 opacity-20">
          <span className="text-[10px] font-bold tracking-widest uppercase">Secured by</span>
          <Logo size={16} showText textClass="text-[12px]" />
        </div>
      )}
    </div>
  );
};

// Add required animations to CSS if not present, but for now using Tailwind-ish names
// We should check index.css to see if we need to add bounce-slow and pulse-subtle.

export default LoadingScreen;

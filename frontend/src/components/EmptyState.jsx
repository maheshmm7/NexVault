import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  variant = 'card', // 'card', 'dashed', 'simple'
  className = '',
}) {
  const baseStyles = "flex flex-col items-center justify-center text-center p-12 transition-all animate-fade-in";
  
  const variantStyles = {
    card: "card bg-surface",
    dashed: "card border-dashed border-2 bg-transparent border-black/10 dark:border-white/10 shadow-none",
    simple: "bg-transparent shadow-none border-none !p-6 opacity-60",
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {Icon && (
        <div className={`mb-6 rounded-[24px] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 ${
          variant === 'simple' 
            ? 'bg-transparent text-muted/40' 
            : 'w-20 h-20 bg-gradient-to-br from-white/[0.04] to-white/[0.01] dark:from-white/[0.03] dark:to-transparent border border-black/5 dark:border-white/5 text-muted/60 shadow-xl'
        }`}>
          <Icon className={`${variant === 'simple' ? 'w-10 h-10' : 'w-8 h-8'}`} strokeWidth={1.25} />
        </div>
      )}
      
      <h3 className={`font-bold text-main tracking-tight ${
        variant === 'simple' ? 'text-base mb-1' : 'text-xl mb-3'
      }`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-muted leading-relaxed max-w-sm mx-auto font-medium ${
          variant === 'simple' ? 'text-sm mb-0' : 'text-sm mb-8'
        }`}>
          {description}
        </p>
      )}

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary mt-2 px-8 py-3 rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

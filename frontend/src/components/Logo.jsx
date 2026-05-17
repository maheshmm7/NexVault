import React from 'react';

/**
 * NEXVAULT Geometric Monogram Logo
 * A premium, scalable SVG-based brand mark.
 */
const Logo = ({ size = 24, className = '', color = 'currentColor', showText = false, textClass = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Geometric Monogram "NV" */}
        {/* N segment */}
        <path
          d="M8 32V8L20 24V8"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* V segment (integrated) */}
        <path
          d="M20 24L32 8V32"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.9 }}
        />
        
        {/* Subtle decorative dot for premium feel */}
        <circle cx="34" cy="34" r="2" fill={color} />
      </svg>
      
      {showText && (
        <span className={`font-bold tracking-tight ${textClass}`}>
          NEX<span className="opacity-70">VAULT</span>
        </span>
      )}
    </div>
  );
};

export default Logo;

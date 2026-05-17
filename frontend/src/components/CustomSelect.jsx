import { useState, useRef, useEffect, useId } from 'react';
import { Check } from 'lucide-react';

/**
 * CustomSelect — a fully styled, rounded drop-in replacement for native <select>.
 *
 * Props:
 *   value        – current selected value (string)
 *   onChange     – (value: string) => void
 *   options      – Array<{ value: string, label: string }>
 *   placeholder  – string shown when no value selected
 *   className    – extra classes applied to the trigger button (e.g. 'min-w-[160px]')
 *   disabled     – boolean
 *   required     – boolean (for form validation; renders a hidden native input)
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  className = '',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  const selected = options.find(o => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && highlighted >= 0) {
          onChange(options[highlighted].value);
          setOpen(false);
        } else {
          setOpen(v => !v);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { setOpen(true); setHighlighted(0); }
        else setHighlighted(h => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Escape':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (open && listRef.current && highlighted >= 0) {
      const el = listRef.current.children[highlighted];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open]);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ minWidth: 0 }}>
      {/* Hidden native input for required form validation */}
      {required && (
        <input
          tabIndex={-1}
          value={value ?? ''}
          required={required}
          readOnly
          aria-hidden="true"
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`input-field flex items-center text-left w-full cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${!selected ? 'text-muted' : ''}`}
      >
        <span className="truncate flex-1">{selected ? selected.label : placeholder}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul
          id={id}
          ref={listRef}
          role="listbox"
          aria-label="Options"
          className="absolute z-[9999] mt-1.5 py-1.5 rounded-xl shadow-2xl border overflow-hidden overflow-y-auto animate-fade-in"
          style={{
            background: 'var(--surface)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)',
            maxHeight: '220px',
            minWidth: '100%',
            width: 'max-content',
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            const isHighlighted = idx === highlighted;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseLeave={() => setHighlighted(-1)}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-sm font-medium transition-colors select-none"
                style={{
                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                  background: isHighlighted
                    ? 'rgba(59,130,246,0.10)'
                    : isSelected
                    ? 'rgba(59,130,246,0.06)'
                    : 'transparent',
                  borderRadius: '8px',
                  margin: '1px 6px',
                }}
              >
                <span className="whitespace-nowrap">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

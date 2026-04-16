'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ComboboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function Combobox({ label, error, className, id, options, value, onChange, ...props }: ComboboxProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on current input text
  const filteredOptions = useMemo(() => {
    if (!options) return [];
    const lowerValue = String(value || '').toLowerCase();
    
    // Exact match means we don't necessarily need to show the dropdown if it's the only option
    const exactMatch = options.find((o) => o.toLowerCase() === lowerValue);
    
    let filtered = options.filter((o) => o.toLowerCase().includes(lowerValue));
    
    // Sort so exact/starts-with matches are higher
    filtered = filtered.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lowerValue);
      const bStarts = b.toLowerCase().startsWith(lowerValue);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });

    // Don't show options if the only option is exactly what we typed (unless they just focused)
    if (filtered.length === 1 && exactMatch) return [];
    
    return filtered.slice(0, 8); // Top 8 relevant suggestions
  }, [options, value]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const highlightMatch = (text: string) => {
    if (!value) return text;
    const lowerValue = String(value).toLowerCase();
    const index = text.toLowerCase().indexOf(lowerValue);
    if (index === -1) return text;
    
    return (
      <>
        {text.slice(0, index)}
        <span className="font-semibold text-brand-600 bg-brand-50">{text.slice(index, index + lowerValue.length)}</span>
        {text.slice(index + lowerValue.length)}
      </>
    );
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900',
            'placeholder:text-gray-400 input-ring',
            error && 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500',
            className
          )}
          autoComplete="off"
          {...props}
        />
        {isOpen && filteredOptions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1.5 py-1.5 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-auto animate-fade-in">
            {filteredOptions.map((option, i) => (
              <li
                key={i}
                onClick={() => handleSelect(option)}
                className="px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 cursor-pointer transition-colors"
                role="option"
                aria-selected={value === option}
              >
                {highlightMatch(option)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

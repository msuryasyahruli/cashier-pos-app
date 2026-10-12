import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400 ${
            icon ? 'pl-10' : ''
          } ${
            error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
};

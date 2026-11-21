import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = "",
  id,
  ...props
}) => {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-ink-secondary pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-primary placeholder-ink-secondary transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring disabled:bg-surface-hover disabled:text-ink-secondary ${
            icon ? "pl-10" : ""
          } ${
            error
              ? "border-status-dangerText/50 focus:border-status-dangerText focus:ring-status-dangerBg"
              : "border-divider"
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-status-dangerText mt-1">{error}</p>}
      {!error && helperText && (
        <p className="text-[11px] text-ink-secondary mt-1">{helperText}</p>
      )}
    </div>
  );
};

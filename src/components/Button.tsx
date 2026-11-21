import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 shadow-sm';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-brand hover:bg-brand-hover text-ink-onPrimary shadow-brand/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-ring',
    secondary: 'bg-ink-primary hover:bg-ink-primary/90 text-surface shadow-divider/40 focus:outline-none focus:ring-2 focus:ring-brand-ring',
    outline: 'border border-divider bg-surface hover:bg-surface-hover text-ink-primary shadow-none focus:outline-none focus:ring-2 focus:ring-brand-ring',
    danger: 'bg-action-danger hover:bg-action-dangerHover text-ink-onPrimary shadow-status-dangerBg focus:outline-none focus:ring-2 focus:ring-status-dangerBg',
    ghost: 'bg-transparent hover:bg-surface-hover text-ink-primary shadow-none focus:outline-none focus:ring-2 focus:ring-brand-ring',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

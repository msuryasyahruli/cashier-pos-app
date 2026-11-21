import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const variantStyles = {
    primary: 'bg-brand-tint text-brand-tintText border border-brand-ring/60',
    success: 'bg-status-successBg text-status-successText border border-status-successText/20',
    warning: 'bg-status-warningBg text-status-warningText border border-status-warningText/20',
    danger: 'bg-status-dangerBg text-status-dangerText border border-status-dangerText/20',
    neutral: 'bg-canvas text-ink-secondary border border-divider',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

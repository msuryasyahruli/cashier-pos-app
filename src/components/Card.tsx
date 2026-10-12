import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  padded?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  padded = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-200 ${
        hoverable ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : ''
      } ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

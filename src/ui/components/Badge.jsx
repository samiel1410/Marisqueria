import React from 'react';

const variants = {
  default: 'bg-primary-100 text-primary-700',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  outline: 'bg-transparent border-2 border-primary-200 text-primary-600',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  dot = false,
  dotColor = 'bg-brand',
}) => {
  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full
      ${variants[variant]} 
      ${sizes[size]} 
      ${className}
    `}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      )}
      {children}
    </span>
  );
};

export default Badge;

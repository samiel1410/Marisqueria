import React from 'react';

const variants = {
  primary: 'bg-primary-900 text-white hover:bg-primary-800 hover:shadow-brand hover:-translate-y-0.5',
  brand: 'bg-brand text-white hover:bg-brand-dark hover:shadow-brand hover:-translate-y-0.5',
  outline: 'bg-transparent border-2 border-primary-200 text-primary-700 hover:border-brand hover:text-brand',
  ghost: 'bg-transparent text-primary-600 hover:bg-primary-100 hover:text-primary-900',
  danger: 'bg-danger text-white hover:bg-red-600 hover:-translate-y-0.5',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  icon: Icon,
  iconSize = 20,
  onClick,
  type = 'button',
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';
  
  // Detect if it's an icon-only button (no children)
  const isIconOnly = !children && Icon;
  const paddingClass = isIconOnly ? 'p-2' : sizes[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${paddingClass} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && Icon && <Icon size={iconSize} className={isIconOnly ? '' : 'flex-shrink-0'} />}
      {children}
    </button>
  );
};

export default Button;

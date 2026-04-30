import React from 'react';

export const Input = ({ 
  label, 
  error, 
  className = '', 
  icon: Icon,
  helper,
  ...props 
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block mb-2 text-sm font-semibold text-primary-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400">
            <Icon size={20} />
          </div>
        )}
        <input
          className={`
            w-full px-4 py-3 rounded-xl bg-white border-2 border-primary-200 
            text-primary-900 placeholder-primary-400
            outline-none transition-all duration-300
            focus:border-brand focus:ring-4 focus:ring-brand/10
            disabled:bg-primary-100 disabled:cursor-not-allowed
            ${Icon ? 'pl-12' : ''}
            ${error ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}
          `}
          {...props}
        />
      </div>
      {helper && !error && (
        <p className="mt-1.5 text-xs text-primary-500">{helper}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>
      )}
    </div>
  );
};

export const Select = ({ 
  label, 
  error, 
  className = '', 
  options = [],
  helper,
  placeholder = 'Seleccione...',
  ...props 
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block mb-2 text-sm font-semibold text-primary-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full px-4 py-3 rounded-xl bg-white border-2 border-primary-200 
            text-primary-900 appearance-none
            outline-none transition-all duration-300
            focus:border-brand focus:ring-4 focus:ring-brand/10
            disabled:bg-primary-100 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}
          `}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {helper && !error && (
        <p className="mt-1.5 text-xs text-primary-500">{helper}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>
      )}
    </div>
  );
};

export default Input;

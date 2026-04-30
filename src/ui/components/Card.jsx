import React from 'react';

export const Card = ({ children, className = '', glass = false, hover = false, ...props }) => {
  const baseClasses = 'bg-white rounded-3xl p-6 shadow-soft border border-primary-200/50';
  const glassClasses = glass ? 'bg-white/70 backdrop-blur-md' : '';
  const hoverClasses = hover ? 'hover:shadow-glass transition-all duration-300 hover:-translate-y-1' : '';
  
  return (
    <div className={`${baseClasses} ${glassClasses} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex items-start justify-between mb-6">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2.5 rounded-2xl bg-brand/10 text-brand">
          <Icon size={24} />
        </div>
      )}
      <div>
        <h3 className="text-xl font-display font-bold text-primary-900">{title}</h3>
        {subtitle && <p className="text-sm text-primary-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

export default Card;

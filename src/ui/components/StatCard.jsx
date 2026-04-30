import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend = null,
  trendLabel = '',
  color = 'brand',
  loading = false 
}) => {
  const colorClasses = {
    brand: 'bg-brand/10 text-brand',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    primary: 'bg-primary-100 text-primary-600',
  };

  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft border border-primary-200/50 hover:shadow-glass transition-all duration-300 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
          {loading ? (
            <div className="w-6 h-6 rounded-full bg-current/20 animate-pulse" />
          ) : (
            Icon && <Icon size={24} />
          )}
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-primary-500'
          }`}>
            {isPositive && <TrendingUp size={16} />}
            {isNegative && <TrendingDown size={16} />}
            {trend}%
          </div>
        )}
      </div>
      
      <div>
        {loading ? (
          <>
            <div className="h-8 w-24 bg-primary-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-16 bg-primary-100 rounded animate-pulse" />
          </>
        ) : (
          <>
            <h3 className="text-2xl font-display font-bold text-primary-900 mb-1">
              {value}
            </h3>
            <p className="text-sm text-primary-500 font-medium">{title}</p>
          </>
        )}
      </div>
      
      {trendLabel && !loading && (
        <p className="text-xs text-primary-400 mt-3">{trendLabel}</p>
      )}
    </div>
  );
};

export default StatCard;

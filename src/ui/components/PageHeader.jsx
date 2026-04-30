import React from 'react';

export const PageHeader = ({ 
  title, 
  subtitle, 
  action,
  breadcrumbs = []
}) => {
  return (
    <div className="mb-8">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-primary-500 mb-3">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {crumb.link ? (
                <a href={crumb.link} className="hover:text-brand transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className={index === breadcrumbs.length - 1 ? 'text-primary-900 font-medium' : ''}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900 mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-primary-500 font-medium">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

export default PageHeader;

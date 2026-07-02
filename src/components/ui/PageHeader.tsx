import React from 'react';
import BackButton from './BackButton';

type PageHeaderVariant = 'plain' | 'gradient' | 'toolbar';

interface PageHeaderProps {
  children?: React.ReactNode;
  title: string;
  subtitle?: string;
  variant?: PageHeaderVariant;
  gradientClassName?: string;
  className?: string;
  contentClassName?: string;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  backFallbackPath?: string;
  onBack?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  variant = 'plain',
  gradientClassName = 'from-primary-500 via-primary-600 to-primary-700',
  className = '',
  contentClassName = '',
  rightAction,
  showBack = true,
  backFallbackPath = '/home',
  onBack,
  children,
}) => {
  if (variant === 'gradient') {
    return (
      <header className={`bg-gradient-to-br ${gradientClassName} app-header-top-safe px-4 pb-6 ${className}`}>
        <div className={`flex items-center gap-3 ${subtitle ? 'mb-4' : ''} ${contentClassName}`}>
          {showBack && <BackButton variant="light" fallbackPath={backFallbackPath} onClick={onBack} />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
          </div>
          {rightAction}
        </div>
        {children}
      </header>
    );
  }

  if (variant === 'toolbar') {
    return (
      <header className={`bg-white px-4 app-toolbar-top-safe pb-3 shadow-sm ${className}`}>
        <div className={`flex items-center justify-between ${contentClassName}`}>
          {showBack ? <BackButton variant="icon" icon="chevron" fallbackPath={backFallbackPath} onClick={onBack} /> : <span className="h-10 w-10" />}
          <div className="min-w-0 flex-1 px-3 text-center">
            <h1 className="truncate font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
          </div>
          {rightAction || <span className="h-10 w-10" />}
        </div>
        {children}
      </header>
    );
  }

  return (
    <header className={`app-top-safe mb-4 ${className}`}>
      {showBack && <BackButton label="Back" variant="text" fallbackPath={backFallbackPath} onClick={onBack} className="mb-4" />}
      <div className={contentClassName}>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
};

export default PageHeader;

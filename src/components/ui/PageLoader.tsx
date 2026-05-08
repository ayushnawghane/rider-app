import React from 'react';

interface PageLoaderProps {
  message?: string;
  variant?: 'light' | 'brand';
}

const PageLoader: React.FC<PageLoaderProps> = ({ message, variant = 'brand' }) => {
  const isLight = variant === 'light';

  return (
    <div className={`flex min-h-screen items-center justify-center ${isLight ? 'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700' : 'bg-gray-50'}`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`h-12 w-12 animate-spin rounded-full border-4 ${isLight ? 'border-white border-t-transparent' : 'border-primary-500 border-t-transparent'}`} />
        {message && <p className={isLight ? 'text-sm font-medium text-white' : 'text-sm font-medium text-gray-600'}>{message}</p>}
      </div>
    </div>
  );
};

export default PageLoader;

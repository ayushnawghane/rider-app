import React from 'react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  variant?: 'fullscreen' | 'overlay' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  blur?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  message = 'Loading...',
  variant = 'fullscreen',
  size = 'md',
  className = '',
  blur = true,
}) => {
  if (!isOpen) return null;

  const sizeConfig = {
    sm: { spinner: 'w-6 h-6', text: 'text-sm' },
    md: { spinner: 'w-10 h-10', text: 'text-base' },
    lg: { spinner: 'w-16 h-16', text: 'text-lg' },
  };

  const Spinner = () => (
    <div className={`${sizeConfig[size].spinner} relative`}>
      <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
      <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center gap-3 py-4 ${className}`}>
        <div className={`${sizeConfig[size].spinner} rounded-full border-2 border-indigo-600 border-t-transparent animate-spin`} />
        {message && <span className={`text-gray-600 ${sizeConfig[size].text}`}>{message}</span>}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-white/80 z-50 ${blur ? 'backdrop-blur-sm' : ''} ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          {message && <span className={`text-gray-700 font-medium ${sizeConfig[size].text}`}>{message}</span>}
        </div>
      </div>
    );
  }

  // fullscreen variant
  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[9999] ${className}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 mx-4 animate-in fade-in zoom-in duration-200">
        <Spinner />
        {message && <span className={`text-gray-800 font-semibold ${sizeConfig[size].text}`}>{message}</span>}
      </div>
    </div>
  );
};

export default LoadingOverlay;

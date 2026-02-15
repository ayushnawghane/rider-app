import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
  hasImage?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  hasImage = false,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${className}`}>
      {hasImage && (
        <Skeleton variant="rounded" height="120px" className="mb-4" />
      )}
      <Skeleton variant="text" width="75%" height="20px" className="mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={`${50 + Math.random() * 30}%`}
          height="16px"
          className={i < lines - 1 ? 'mb-2' : ''}
        />
      ))}
    </div>
  );
};

interface SkeletonListProps {
  count?: number;
  lines?: number;
  hasImage?: boolean;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 3,
  lines = 3,
  hasImage = false,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} hasImage={hasImage} />
      ))}
    </div>
  );
};

export default Skeleton;

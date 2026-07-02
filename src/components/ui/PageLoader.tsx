import React from 'react';
import Skeleton from '../Skeleton';

interface PageLoaderProps {
  message?: string;
  variant?: 'light' | 'brand';
}

/**
 * Generic page-load placeholder. Renders content skeletons (no spinner) so a
 * loading screen previews the shape of what's coming.
 */
const PageLoader: React.FC<PageLoaderProps> = () => {
  return (
    <div className="min-h-screen px-5 pt-14" style={{ background: 'var(--bg)' }}>
      <Skeleton variant="text" width="60%" height="32px" className="mb-2" />
      <Skeleton variant="text" width="40%" height="16px" className="mb-7" />
      <div className="space-y-3">
        <Skeleton variant="rounded" height="120px" />
        <Skeleton variant="rounded" height="88px" />
        <Skeleton variant="rounded" height="88px" />
      </div>
    </div>
  );
};

export default PageLoader;

import React from 'react';
import Skeleton from './Skeleton';

/**
 * App-shaped skeleton shown while the session/auth bootstraps — replaces the
 * old full-screen spinner. Mimics the home chrome so the app feels like it's
 * assembling rather than blocking.
 */
const BootSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header band */}
      <div className="aurora-golden grain relative h-[210px] rounded-b-[36px] px-5 pt-14">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton variant="text" width="90px" height="12px" />
            <Skeleton variant="text" width="150px" height="30px" />
          </div>
          <Skeleton variant="circular" width="44px" height="44px" />
        </div>
      </div>

      {/* Floating search card */}
      <div className="-mt-6 px-5">
        <div className="glass rounded-3xl p-4 shadow-soft">
          <Skeleton variant="rounded" height="48px" className="mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="rounded" height="56px" />
            <Skeleton variant="rounded" height="56px" />
          </div>
          <Skeleton variant="rounded" height="52px" className="mt-4" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-4 gap-3 px-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton variant="rounded" width="56px" height="56px" />
            <Skeleton variant="text" width="70%" height="10px" />
          </div>
        ))}
      </div>

      {/* Row of cards */}
      <div className="mt-7 px-5">
        <Skeleton variant="text" width="140px" height="22px" className="mb-3" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-40 shrink-0">
              <Skeleton variant="rounded" height="112px" className="mb-2" />
              <Skeleton variant="text" width="60%" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BootSkeleton;

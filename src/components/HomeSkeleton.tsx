import React from 'react';
import Skeleton from './Skeleton';

/**
 * Home-shaped loading skeleton — mirrors HomePage chrome (aura header, search
 * card, quick actions, route cards) so loading into /home previews the page.
 */
const HomeSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-white">
      {/* Header aura (right-weighted, light left) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[460px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(115% 72% at 84% -8%, rgba(255,107,0,0.5) 0%, rgba(255,160,30,0.2) 44%, rgba(255,255,255,0) 72%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.78) 0%, transparent 62%)', filter: 'blur(48px)' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pb-2 pt-[calc(env(safe-area-inset-top)+20px)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo-mark.png" alt="Blinkcar" className="h-10 w-10 rounded-[14px] object-cover shadow-glow" />
              <span className="font-display text-lg font-extrabold lowercase tracking-tight text-ink">blinkcar</span>
            </div>
            <Skeleton variant="rounded" width="44px" height="44px" />
          </div>
          <div className="space-y-2 pb-3">
            <Skeleton variant="text" width="90px" height="12px" />
            <Skeleton variant="text" width="180px" height="34px" />
            <div className="flex gap-2 pt-1">
              <Skeleton variant="rounded" width="120px" height="30px" />
              <Skeleton variant="rounded" width="64px" height="30px" />
            </div>
          </div>
        </div>

        {/* Search card */}
        <div className="mt-2 px-4">
          <div className="rounded-[18px] border border-black/5 bg-white/80 p-4 shadow-strong backdrop-blur-md">
            <Skeleton variant="rounded" height="50px" className="mb-4" />
            <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <Skeleton variant="rounded" height="56px" />
              <Skeleton variant="rounded" width="44px" height="44px" />
              <Skeleton variant="rounded" height="56px" />
            </div>
            <Skeleton variant="rounded" height="52px" className="mb-3" />
            <Skeleton variant="rounded" height="56px" />
          </div>

          {/* Quick actions */}
          <div className="mt-7">
            <Skeleton variant="text" width="120px" height="20px" className="mb-3" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton variant="rounded" width="64px" height="64px" />
                  <Skeleton variant="text" width="80%" height="10px" />
                </div>
              ))}
            </div>
          </div>

          {/* Routes */}
          <div className="mt-7">
            <Skeleton variant="text" width="160px" height="24px" className="mb-3" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-44 shrink-0">
                  <Skeleton variant="rounded" height="128px" className="mb-2" />
                  <Skeleton variant="text" width="60%" height="20px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSkeleton;

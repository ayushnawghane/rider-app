import React from 'react';
import Aurora from './ui/Aurora';
import Skeleton from './Skeleton';

/**
 * Branded loading screen shown while the session/auth bootstraps. Mirrors the
 * login aesthetic — grainy orange aura on white, the Blinkcar mark, and a
 * glassy card with skeleton placeholders (no spinner).
 */
const BootSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60]">
      <Aurora variant="sunrise" grain="strong" className="min-h-screen">
        <div className="flex min-h-screen w-full items-center justify-center px-5 py-10 app-top-safe">
          <div className="w-full max-w-sm rounded-[32px] border border-white/60 bg-white/35 p-6 shadow-strong backdrop-blur-sm sm:p-7">
            {/* Brand */}
            <div className="mb-7 flex flex-col items-center text-center">
              <img
                src="/logo-mark.png"
                alt="Blinkcar"
                className="mb-3 h-14 w-14 animate-pulse rounded-[20px] object-cover shadow-glow"
              />
              <span className="font-display text-[11px] font-extrabold lowercase tracking-tight text-fire-orange">
                blinkcar
              </span>
            </div>

            {/* Form placeholders */}
            <div className="space-y-4">
              <Skeleton variant="rounded" height="58px" />
              <Skeleton variant="rounded" height="58px" />
              <div className="my-5 h-px bg-black/10" />
              <Skeleton variant="rounded" height="52px" />
              <Skeleton variant="rounded" height="52px" />
            </div>
          </div>
        </div>
      </Aurora>
    </div>
  );
};

export default BootSkeleton;

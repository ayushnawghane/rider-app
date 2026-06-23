import React from 'react';
import Aurora from './ui/Aurora';

/**
 * Branded boot loader shown while the session/auth bootstraps. Route-agnostic
 * (it can't know which page is coming), so it's just the brand on the grainy
 * orange aura with a subtle loading shimmer — not a page-shaped skeleton.
 */
const BootSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60]">
      <Aurora variant="sunrise" grain="strong" className="min-h-screen">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
          <img
            src="/logo-mark.png"
            alt="Blinkcar"
            className="h-20 w-20 animate-pulse rounded-[24px] object-cover shadow-glow"
          />
          <span className="font-display text-2xl font-extrabold lowercase tracking-tight text-ink">
            blinkcar
          </span>
          <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full w-1/2 animate-pulse rounded-full"
              style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}
            />
          </div>
        </div>
      </Aurora>
    </div>
  );
};

export default BootSkeleton;

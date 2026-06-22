import React from 'react';

type AuroraVariant = 'golden' | 'fire-night';

interface AuroraProps {
  variant?: AuroraVariant;
  /** Render content above the aurora (positioned in a z-10 layer). */
  children?: React.ReactNode;
  className?: string;
  /** Grain intensity over the gradient. Hero = 'strong'. */
  grain?: 'soft' | 'base' | 'strong';
  /** Pause the slow drift (e.g. for static hero crops). */
  still?: boolean;
}

const grainClass: Record<NonNullable<AuroraProps['grain']>, string> = {
  soft: 'grain grain-soft',
  base: 'grain',
  strong: 'grain grain-strong',
};

/**
 * Golden Horizon aurora background. Layers large, soft, slowly-drifting
 * radial blooms + a grain overlay. Place content as children — it renders
 * above the gradient in a relative z-10 layer.
 */
const Aurora: React.FC<AuroraProps> = ({
  variant = 'golden',
  children,
  className = '',
  grain = 'base',
  still = false,
}) => {
  const isNight = variant === 'fire-night';
  const baseBg = isNight ? 'var(--char)' : 'var(--paper)';
  const drift = still ? '' : 'animate-aurora-1';
  const drift2 = still ? '' : 'animate-aurora-2';
  const drift3 = still ? '' : 'animate-aurora-3';

  const blooms = isNight
    ? [
        { c: 'var(--fire-orange)', pos: 'top-[-10%] right-[-5%] h-[70%] w-[70%]', a: drift, o: 0.85 },
        { c: 'var(--fire-red)', pos: 'bottom-[-15%] left-[-10%] h-[80%] w-[80%]', a: drift2, o: 0.8 },
        { c: 'var(--fire-amber)', pos: 'top-[35%] left-[30%] h-[55%] w-[55%]', a: drift3, o: 0.5 },
      ]
    : [
        { c: 'var(--fire-orange)', pos: 'top-[-5%] right-[5%] h-[65%] w-[75%]', a: drift, o: 0.9 },
        { c: 'var(--hot-pink)', pos: 'bottom-[5%] left-[-10%] h-[60%] w-[65%]', a: drift2, o: 0.7 },
        { c: 'var(--fire-gold)', pos: 'top-[25%] left-[25%] h-[70%] w-[70%]', a: drift3, o: 0.85 },
      ];

  return (
    <div
      className={`relative isolate overflow-hidden ${grainClass[grain]} ${className}`}
      style={{ background: baseBg }}
    >
      <div className="pointer-events-none absolute inset-0 z-0" style={{ filter: 'saturate(1.08)' }}>
        {blooms.map((b, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${b.pos} ${b.a}`}
            style={{
              background: `radial-gradient(circle at center, ${b.c} 0%, transparent 62%)`,
              opacity: b.o,
              filter: 'blur(54px)',
              willChange: 'transform',
            }}
          />
        ))}
        {isNight && (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, var(--char) 0%, transparent 55%, rgba(255,61,0,0.35) 130%)' }}
          />
        )}
      </div>
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};

export default Aurora;

/** Standalone grain overlay — drop into any positioned container. */
export const Grain: React.FC<{ intensity?: 'soft' | 'base' | 'strong'; className?: string }> = ({
  intensity = 'base',
  className = '',
}) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute inset-0 z-[2] ${grainClass[intensity]} ${className}`}
  />
);

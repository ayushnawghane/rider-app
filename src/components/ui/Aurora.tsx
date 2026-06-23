import React from 'react';

type AuroraVariant = 'golden' | 'fire-night' | 'mist' | 'sunrise';

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

// High-contrast grayscale noise, multiplied OVER the content so it textures
// every surface (cards, buttons, white areas) — not just the gradient below.
const NOISE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)'/%3E%3C/svg%3E\")";
const overGrainOpacity: Record<NonNullable<AuroraProps['grain']>, number> = {
  soft: 0.07,
  base: 0.11,
  strong: 0.17,
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
  const baseByVariant: Record<AuroraVariant, string> = {
    'fire-night': 'var(--char)',
    mist: '#ffffff',
    golden: 'var(--paper)',
    // White canvas — only the orange aurora blooms provide colour.
    sunrise: '#ffffff',
  };
  const baseBg = baseByVariant[variant];
  const drift = still ? '' : 'animate-aurora-1';
  const drift2 = still ? '' : 'animate-aurora-2';
  const drift3 = still ? '' : 'animate-aurora-3';

  const bloomsByVariant: Record<AuroraVariant, Array<{ c: string; pos: string; a: string; o: number }>> = {
    'fire-night': [
      { c: 'var(--fire-orange)', pos: 'top-[-10%] right-[-5%] h-[70%] w-[70%]', a: drift, o: 0.85 },
      { c: 'var(--fire-red)', pos: 'bottom-[-15%] left-[-10%] h-[80%] w-[80%]', a: drift2, o: 0.8 },
      { c: 'var(--fire-amber)', pos: 'top-[35%] left-[30%] h-[55%] w-[55%]', a: drift3, o: 0.5 },
    ],
    golden: [
      { c: 'var(--fire-orange)', pos: 'top-[-5%] right-[5%] h-[65%] w-[75%]', a: drift, o: 0.9 },
      { c: 'var(--hot-pink)', pos: 'bottom-[5%] left-[-10%] h-[60%] w-[65%]', a: drift2, o: 0.7 },
      { c: 'var(--fire-gold)', pos: 'top-[25%] left-[25%] h-[70%] w-[70%]', a: drift3, o: 0.85 },
    ],
    // Soft orange/pink/gold bloom concentrated toward center on pure white —
    // airy, lots of white space (ref: single warm aura on white).
    mist: [
      { c: 'var(--fire-orange)', pos: 'top-[20%] left-[24%] h-[62%] w-[62%]', a: drift, o: 0.7 },
      { c: 'var(--fire-gold)', pos: 'top-[6%] right-[2%] h-[58%] w-[58%]', a: drift2, o: 0.62 },
      { c: 'var(--hot-pink)', pos: 'bottom-[2%] left-[2%] h-[58%] w-[58%]', a: drift3, o: 0.5 },
      { c: 'var(--fire-red)', pos: 'top-[38%] left-[40%] h-[34%] w-[34%]', a: drift2, o: 0.4 },
    ],
    // A big, bold warm orange/amber/gold orb on white — no pink, no salmon.
    sunrise: [
      { c: 'var(--fire-orange)', pos: 'top-[14%] left-[6%] h-[88%] w-[90%]', a: drift, o: 1 },
      { c: 'var(--fire-amber)', pos: 'top-[30%] left-[20%] h-[72%] w-[72%]', a: drift2, o: 0.92 },
      { c: 'var(--fire-yellow)', pos: 'top-[8%] left-[28%] h-[54%] w-[66%]', a: drift3, o: 0.95 },
      { c: 'var(--fire-orange)', pos: 'top-[28%] left-[-2%] h-[54%] w-[54%]', a: drift, o: 0.9 },
      { c: 'var(--fire-gold)', pos: 'top-[20%] left-[18%] h-[74%] w-[74%]', a: drift2, o: 0.7 },
    ],
  };
  const blooms = bloomsByVariant[variant];

  return (
    <div
      className={`relative isolate overflow-hidden ${grainClass[grain]} ${className}`}
      style={{ background: baseBg }}
    >
      <div className="pointer-events-none absolute inset-0 z-0" style={{ filter: 'saturate(1.18)' }}>
        {blooms.map((b, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${b.pos} ${b.a}`}
            style={{
              background: `radial-gradient(circle at center, ${b.c} 0%, transparent 66%)`,
              opacity: b.o,
              filter: 'blur(44px)',
              willChange: 'transform',
            }}
          />
        ))}
        {variant === 'fire-night' && (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, var(--char) 0%, transparent 55%, rgba(255,61,0,0.35) 130%)' }}
          />
        )}
      </div>
      <div className="relative z-10 h-full w-full">{children}</div>
      {/* Film grain over everything (cards, buttons, text) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          backgroundImage: NOISE_URL,
          backgroundSize: '170px 170px',
          mixBlendMode: 'multiply',
          opacity: overGrainOpacity[grain],
        }}
      />
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

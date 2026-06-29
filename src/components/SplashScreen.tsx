import React, { useState, useEffect } from 'react';
import Aurora from './ui/Aurora';
import splash1 from '../assets/images/splash1.png';
import splash2 from '../assets/images/splash2.png';
import splash3 from '../assets/images/splash3.png';

interface SplashScreenProps {
    onFinish: () => void;
    hasSeenOnboarding?: boolean;
}

type Slide = {
    image: string;
    eyebrow: string;
    title: React.ReactNode;
    description: string | null;
};

const ONBOARDING_SLIDES: Slide[] = [
    {
        image: splash1,
        eyebrow: 'Ride together',
        title: (
            <>
                Find your<br />
                <span className="text-fire italic">ride.</span>
            </>
        ),
        description: 'Verified co-travellers. Gamified booking.',
    },
    {
        image: splash2,
        eyebrow: 'Why Blinkcar',
        title: (
            <>
                Intercity travel,<br />
                <span className="text-fire">smarter.</span>
            </>
        ),
        description: 'Smoother, cheaper, built for the long haul.',
    },
    {
        image: splash3,
        eyebrow: 'Get rewarded',
        title: (
            <>
                Earn<br />
                <span className="text-fire">Blinkpoints.</span>
            </>
        ),
        description: 'Book or share rides. Stack rewards.',
    },
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, hasSeenOnboarding = false }) => {
    const [phase, setPhase] = useState<'brand' | 'onboarding'>('brand');
    const [slideIndex, setSlideIndex] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [brandVisible, setBrandVisible] = useState(false);
    const [slideVisible, setSlideVisible] = useState(false);

    // Brand splash: fade in → hold → exit to onboarding (or finish)
    useEffect(() => {
        // Fade the brand in and keep it on screen for the whole phase — no
        // dependency on heavy network assets, no empty-gradient gap.
        const t1 = setTimeout(() => setBrandVisible(true), 80);
        const t3 = setTimeout(() => {
            if (hasSeenOnboarding) {
                onFinish();
            } else {
                setPhase('onboarding');
                setTimeout(() => setSlideVisible(true), 80);
            }
        }, 2600);
        return () => {
            clearTimeout(t1);
            clearTimeout(t3);
        };
    }, [hasSeenOnboarding, onFinish]);

    const goToSlide = (index: number) => {
        if (animating) return;
        setAnimating(true);
        setSlideVisible(false);
        setTimeout(() => {
            setSlideIndex(index);
            setSlideVisible(true);
            setAnimating(false);
        }, 350);
    };

    const handleNext = () => {
        if (slideIndex < ONBOARDING_SLIDES.length - 1) {
            goToSlide(slideIndex + 1);
        } else {
            onFinish();
        }
    };

    const handleSkip = () => onFinish();

    const slide = ONBOARDING_SLIDES[slideIndex];
    const isLast = slideIndex === ONBOARDING_SLIDES.length - 1;

    /* ─── Brand Splash ─────────────────────────────────────────────── */
    if (phase === 'brand') {
        return (
            <div className="fixed inset-0 z-[9999]">
                <Aurora variant="golden" grain="strong" className="h-full w-full">
                    <div
                        className="flex h-full w-full flex-col items-center justify-center px-8 text-center transition-all duration-700 ease-out"
                        style={{
                            opacity: brandVisible ? 1 : 0,
                            transform: brandVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
                        }}
                    >
                        <img src="/logo.png" alt="blinkcar" className="h-24 w-24 object-contain rounded-[28px]" />
                        <h1 className="font-display text-[4.5rem] font-extrabold leading-[0.9] tracking-tightest text-ink">
                            blinkcar
                        </h1>
                        <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.32em] text-ink/55">
                            India's Smartest Carpooling App
                        </p>
                    </div>
                </Aurora>
            </div>
        );
    }

    /* ─── Onboarding Slides ─────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-[9999]">
            <Aurora variant="golden" grain="base" className="h-full w-full">
                <div className="mx-auto flex h-full w-full max-w-md flex-col px-7 pb-12 pt-[calc(env(safe-area-inset-top)+28px)]">
                    {/* Skip */}
                    <div className="flex justify-end">
                        {!isLast ? (
                            <button
                                onClick={handleSkip}
                                className="rounded-full px-4 py-2 font-display text-sm font-semibold text-ink/55 transition active:scale-95"
                                type="button"
                            >
                                Skip
                            </button>
                        ) : (
                            <span className="h-9" />
                        )}
                    </div>

                    {/* Illustration */}
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className="w-full transition-all duration-[350ms] ease-out"
                            style={{
                                opacity: slideVisible ? 1 : 0,
                                transform: slideVisible ? 'translateY(0)' : 'translateY(24px)',
                            }}
                        >
                            <img src={slide.image} alt="" className="mx-auto w-[82%] max-w-[300px] object-contain drop-shadow-2xl" />
                        </div>
                    </div>

                    {/* Text */}
                    <div
                        className="mb-8 transition-all duration-[350ms] ease-out"
                        style={{
                            opacity: slideVisible ? 1 : 0,
                            transform: slideVisible ? 'translateY(0)' : 'translateY(16px)',
                            transitionDelay: '80ms',
                        }}
                    >
                        <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.28em] text-fire-orange">
                            {slide.eyebrow}
                        </p>
                        <h2 className="font-display text-[3.25rem] font-extrabold leading-[0.92] tracking-tightest text-ink">
                            {slide.title}
                        </h2>
                        {slide.description && (
                            <p className="mt-4 max-w-[20rem] text-base font-medium leading-relaxed text-ink/60">
                                {slide.description}
                            </p>
                        )}
                    </div>

                    {/* Dots */}
                    <div className="mb-6 flex items-center gap-2">
                        {ONBOARDING_SLIDES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => i !== slideIndex && goToSlide(i)}
                                aria-label={`Go to slide ${i + 1}`}
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: i === slideIndex ? 28 : 8,
                                    background: i === slideIndex
                                        ? 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))'
                                        : 'rgba(26,14,6,0.18)',
                                }}
                            />
                        ))}
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleNext}
                        type="button"
                        className="w-full rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg active:scale-[0.97]"
                        style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}
                    >
                        {isLast ? 'Get Started' : 'Next'}
                    </button>
                </div>
            </Aurora>
        </div>
    );
};

export default SplashScreen;

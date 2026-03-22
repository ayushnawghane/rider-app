import React, { useState, useEffect } from 'react';
import splash1 from '../assets/images/splash1.png';
import splash2 from '../assets/images/splash2.png';
import splash3 from '../assets/images/splash3.png';

interface SplashScreenProps {
    onFinish: () => void;
    hasSeenOnboarding?: boolean;
}

const ONBOARDING_SLIDES = [
    {
        image: splash1,
        title: 'Find your ride',
        titleHighlight: false,
        description: 'Verified co-travellers. Gamified booking.',
    },
    {
        image: splash2,
        title: null,
        titleHighlight: true,
        richTitle: (
            <>
                <span style={{ color: '#FF5722', fontStyle: 'italic', fontWeight: 700 }}>Blinkcar</span>{' '}
                makes intercity travel,
                <br />
                smoother, cheaper, smarter.
            </>
        ),
        description: null,
    },
    {
        image: splash3,
        title: 'Earn Blinkpoints',
        titleHighlight: true,
        description: 'Book or share rides. Stack rewards.',
    },
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, hasSeenOnboarding = false }) => {
    const [phase, setPhase] = useState<'brand' | 'onboarding'>('brand');
    const [slideIndex, setSlideIndex] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [brandVisible, setBrandVisible] = useState(false);
    const [slideVisible, setSlideVisible] = useState(false);

    // Brand splash animation: fade in → hold → fade out → switch to onboarding or exit
    useEffect(() => {
        const t1 = setTimeout(() => setBrandVisible(true), 100);
        const t2 = setTimeout(() => setBrandVisible(false), 2000);
        const t3 = setTimeout(() => {
            if (hasSeenOnboarding) {
                onFinish();
            } else {
                setPhase('onboarding');
                setTimeout(() => setSlideVisible(true), 80);
            }
        }, 2700);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
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

    const handleSkip = () => {
        onFinish();
    };

    const slide = ONBOARDING_SLIDES[slideIndex];
    const isLast = slideIndex === ONBOARDING_SLIDES.length - 1;

    /* ─── Brand Splash ─────────────────────────────────────────────── */
    if (phase === 'brand') {
        return (
            <div style={styles.root}>
                <div style={{ ...styles.brandContainer, opacity: brandVisible ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                    <img src="/logo.png" alt="Blinkcar Logo" style={{ width: 48, height: 48, marginRight: 12, objectFit: 'contain', borderRadius: 12 }} />
                    <span style={{ ...styles.brandLogo, color: '#FF5722' }}>Blinkcar</span>
                </div>
            </div>
        );
    }

    /* ─── Onboarding Slides ─────────────────────────────────────────── */
    return (
        <div style={styles.root}>
            <div style={styles.card}>
                {/* Skip button */}
                {!isLast && (
                    <button style={styles.skipBtn} onClick={handleSkip}>
                        Skip
                    </button>
                )}

                {/* Illustration */}
                <div
                    style={{
                        ...styles.imageWrap,
                        opacity: slideVisible ? 1 : 0,
                        transform: slideVisible ? 'translateY(0px)' : 'translateY(24px)',
                        transition: 'opacity 0.35s ease, transform 0.35s ease',
                    }}
                >
                    <img src={slide.image} alt="illustration" style={styles.image} />
                </div>

                {/* Text */}
                <div
                    style={{
                        ...styles.textWrap,
                        opacity: slideVisible ? 1 : 0,
                        transform: slideVisible ? 'translateY(0px)' : 'translateY(16px)',
                        transition: 'opacity 0.35s ease 0.08s, transform 0.35s ease 0.08s',
                    }}
                >
                    {slide.richTitle ? (
                        <p style={styles.richTitle}>{slide.richTitle}</p>
                    ) : (
                        <h2
                            style={{
                                ...styles.title,
                                color: slide.titleHighlight ? '#FF5722' : '#1a1a1a',
                            }}
                        >
                            {slide.title}
                        </h2>
                    )}
                    {slide.description && <p style={styles.description}>{slide.description}</p>}
                </div>

                {/* Dots */}
                <div style={styles.dotsRow}>
                    {ONBOARDING_SLIDES.map((_, i) => (
                        <button
                            key={i}
                            style={{
                                ...styles.dot,
                                background: i === slideIndex ? '#FF5722' : '#e0d8d5',
                                width: i === slideIndex ? 22 : 8,
                            }}
                            onClick={() => i !== slideIndex && goToSlide(i)}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>

                {/* CTA Button */}
                <button style={styles.ctaBtn} onClick={handleNext}>
                    {isLast ? 'Get Started' : 'Next'}
                </button>
            </div>
        </div>
    );
};

/* ─── Styles ────────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
    root: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
    },
    brandLogo: {
        fontSize: 44,
        fontWeight: 800,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        letterSpacing: '-1.5px',
        color: '#1a1a1a',
        lineHeight: 1,
    },
    card: {
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px 56px',
        boxSizing: 'border-box',
    },
    skipBtn: {
        position: 'absolute',
        top: 52,
        right: 28,
        background: 'transparent',
        border: 'none',
        color: '#999',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        padding: '4px 8px',
        fontFamily: 'inherit',
    },
    imageWrap: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        marginTop: 24,
    },
    image: {
        width: '88%',
        maxWidth: 320,
        height: 'auto',
        objectFit: 'contain',
        borderRadius: 16,
    },
    textWrap: {
        width: '100%',
        textAlign: 'center',
        marginBottom: 36,
        minHeight: 88,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        margin: 0,
        letterSpacing: '-0.3px',
        lineHeight: 1.3,
    },
    richTitle: {
        fontSize: 17,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        color: '#333',
        fontWeight: 500,
        margin: 0,
        lineHeight: 1.6,
        letterSpacing: '-0.1px',
    },
    description: {
        fontSize: 14,
        color: '#888',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        margin: 0,
        lineHeight: 1.6,
        fontWeight: 400,
    },
    dotsRow: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 36,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'width 0.3s ease, background 0.3s ease',
    },
    ctaBtn: {
        width: '100%',
        padding: '16px 0',
        background: '#FF5722',
        color: '#ffffff',
        border: 'none',
        borderRadius: 14,
        fontSize: 16,
        fontWeight: 700,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        cursor: 'pointer',
        letterSpacing: '0.2px',
        transition: 'background 0.2s ease, transform 0.15s ease',
        boxShadow: '0 4px 20px rgba(255,87,34,0.28)',
    },
};

export default SplashScreen;

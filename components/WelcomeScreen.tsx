import React, { useState, useEffect } from 'react';
import { WelcomeLoadingAnimation } from './WelcomeLoadingAnimation';

interface WelcomeScreenProps {
  onComplete: () => void;
}

/**
 * Full-screen splash overlay. Always renders as a fixed dark theme
 * (black bg, off-white text, #D4AF37 gold) regardless of site light/dark mode —
 * light-mode CSS remaps Tailwind tokens like bg-black / text-white, so colors
 * here use literal hex / inline styles only.
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 1000);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all ease-in-out ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#000000',
        color: '#F8F8F8',
        transitionDuration: isFadingOut ? '1000ms' : '0ms',
      }}
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onComplete();
        }, 1000);
      }}
    >
      {/* Background with animated elements */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to bottom right, #111827, #000000, #111827)',
          }}
        />

        {/* Animated floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-20 left-20 w-32 h-32 rounded-full animate-pulse-slow"
            style={{
              background:
                'linear-gradient(to bottom right, rgba(212, 175, 55, 0.10), transparent)',
            }}
          />
          <div
            className="absolute bottom-20 right-20 w-40 h-40 rounded-full animate-pulse-slow delay-1000"
            style={{
              background:
                'linear-gradient(to bottom right, rgba(212, 175, 55, 0.08), transparent)',
            }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full animate-pulse-slow delay-500"
            style={{
              background:
                'linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), transparent)',
            }}
          />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.05,
            backgroundImage: `
              linear-gradient(to right, #D4AF37 1px, transparent 1px),
              linear-gradient(to bottom, #D4AF37 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main content */}
      <div className="text-center space-y-8 relative z-10 max-w-4xl mx-auto px-4 sm:px-8">
        <div className="relative inline-block">
          <WelcomeLoadingAnimation size="medium" />
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold tracking-wider mb-4 opacity-0 animate-fade-in transition-all duration-2000"
          style={{ color: '#F8F8F8', animationDelay: '0.3s' }}
        >
          Welcome to BlackBox
        </h1>

        <div
          className="space-y-2 opacity-0 animate-fade-in transition-all duration-2000"
          style={{ animationDelay: '0.6s' }}
        >
          <p
            className="text-lg sm:text-2xl md:text-3xl font-heading font-semibold tracking-wide"
            style={{ color: '#D4AF37' }}
          >
            Premium Tech Repository
          </p>
          <div
            className="w-40 h-1 mx-auto"
            style={{
              backgroundImage:
                'linear-gradient(to right, transparent, #D4AF37, transparent)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

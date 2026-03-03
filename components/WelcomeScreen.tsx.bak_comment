import React, { useState, useEffect } from 'react';
import { Package, ArrowRight, Sparkles } from 'lucide-react';
import { WelcomeLoadingAnimation } from './WelcomeLoadingAnimation';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Completely remove hour check for testing - always show welcome screen
    // Store current visit time
    localStorage.setItem('bb_welcome_last_visit', Date.now().toString());

    // Show welcome screen for 6 seconds (increased for better viewing)
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 3000); // Much slower fade out transition
    }, 6000); // Increased to 6 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-all ease-in-out ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{
        transitionDuration: isFadingOut ? '3000ms' : '0ms'
      }}
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onComplete();
        }, 3000);
      }}
    >
      {/* Background with animated elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
        
        {/* Animated floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-[#D4AF37]/8 to-transparent rounded-full animate-pulse-slow delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full animate-pulse-slow delay-500"></div>
        </div>

        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, #D4AF37 1px, transparent 1px),
              linear-gradient(to bottom, #D4AF37 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Main content */}
      <div className="text-center space-y-8 relative z-10 max-w-4xl mx-auto px-4 sm:px-8">
        {/* Logo animation */}
        <div className="relative inline-block">
          <div>
            <WelcomeLoadingAnimation size="medium" />
          </div>

          
          {/* Sparkles around logo */}
          <div className="absolute -top-4 -right-4 opacity-0 animate-fade-in transition-all duration-2000" style={{animationDelay: '0.5s'}}>
            {/* <Sparkles size={24} className="text-[#D4AF37]" /> */}
          </div>
          <div className="absolute -bottom-4 -left-4 opacity-0 animate-fade-in transition-all duration-2000" style={{animationDelay: '0.8s'}}>
            {/* <Sparkles size={20} className="text-[#D4AF37]" /> */}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold text-off-white tracking-wider mb-4 opacity-0 animate-fade-in transition-all duration-2000" style={{animationDelay: '0.3s'}}>
          Welcome to BlackBox
        </h1>

        {/* Subtitle */}
        <div className="space-y-2 opacity-0 animate-fade-in transition-all duration-2000" style={{animationDelay: '0.6s'}}>
          <p className="text-lg sm:text-2xl md:text-3xl text-[#D4AF37] font-heading font-semibold tracking-wide">
            Premium Tech Repository
          </p>
          <div className="w-40 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto"></div>
        </div>

        {/* Description */}
        <div className="space-y-4 max-w-2xl mx-auto opacity-0 animate-fade-in transition-all duration-2000" style={{animationDelay: '0.9s'}}>
          <p className="text-base sm:text-xl text-gray-300 leading-relaxed">
            Discover cutting-edge technology, expert repairs, and seamless trade-ins
          </p>
          <p className="text-sm sm:text-lg text-gray-400">
            Your journey starts here
          </p>
        </div>

        {/* Loading dots */}
        {/* <div className="flex justify-center gap-2 mt-12 opacity-0 animate-fade-in transition-all duration-2000" style={{animationDelay: '1.2s'}}>
          <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce delay-150"></div>
          <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce delay-300"></div>
        </div> */}
      </div>
    </div>
  );
};

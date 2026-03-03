import React from 'react';

export const WelcomeLoadingAnimation: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-20 h-20',
    medium: 'w-32 h-32',
    large: 'w-40 h-40'
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg 
        className={`${sizeClasses[size]}`} 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          @keyframes pillPulse {
            0%, 100% { opacity: 0.9; transform: scaleX(1); }
            50% { opacity: 0.5; transform: scaleX(0.85); }
          }

          @keyframes race {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -484; }
          }

          @keyframes labelFade {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.7; }
          }

          .animate-pill {
            animation: pillPulse 2s ease-in-out infinite;
          }

          .animate-race {
            animation: race 2s linear infinite;
          }

          .animate-label {
            animation: labelFade 2s ease-in-out infinite;
          }
        `}</style>

        {/* Ghost Track */}
        <path
          className="fill-none stroke-white/10 stroke-[14] rounded-full"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="
            M 50,38 L 150,38
            Q 162,38 162,50
            L 162,150
            Q 162,162 150,162
            L 50,162
            Q 38,162 38,150
            L 38,50
            Q 38,38 50,38
            Z
          "
        />

        {/* Racing Arc */}
        <path
          className="fill-none stroke-white stroke-[14] animate-race"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="90 394"
          strokeDashoffset="0"
          style={{ 
            filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 18px rgba(255,255,255,0.4))' 
          }}
          d="
            M 50,38 L 150,38
            Q 162,38 162,50
            L 162,150
            Q 162,162 150,162
            L 50,162
            Q 38,162 38,150
            L 38,50
            Q 38,38 50,38
            Z
          "
        />

        {/* Center Pill */}
        <rect
          x="62"
          y="84"
          width="76"
          height="32"
          rx="16"
          ry="16"
          className="fill-white opacity-90 animate-pill origin-center"
          transformOrigin="100 100"
        />
      </svg>

      <span className="text-white/40 text-[8px] tracking-[0.35em] uppercase animate-label">
        Loading
      </span>
    </div>
  );
};

export default WelcomeLoadingAnimation;

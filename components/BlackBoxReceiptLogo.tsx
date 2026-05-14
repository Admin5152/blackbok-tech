import React from 'react';

/** Vector BlackBox mark + wordmark for receipts and print (uses `currentColor` for text). */
export function BlackBoxReceiptLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 44"
      className={className}
      role="img"
      aria-label="BlackBox"
    >
      <rect x="1" y="5" width="34" height="34" rx="7" fill="none" stroke="#D4AF37" strokeWidth="2.25" />
      <rect x="9" y="12" width="18" height="3" rx="1" fill="#D4AF37" />
      <rect x="9" y="19" width="18" height="3" rx="1" fill="#D4AF37" />
      <rect x="9" y="26" width="13" height="3" rx="1" fill="#D4AF37" />
      <text
        x="44"
        y="30"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontSize="17"
        fontWeight="900"
        letterSpacing="0.22em"
      >
        BLACKBOX
      </text>
    </svg>
  );
}

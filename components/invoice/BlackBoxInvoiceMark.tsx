import React from 'react';

/**
 * BlackBox letterhead mark — matches store invoice INV-000125:
 * four thick L-brackets (rounded outer corners, square-cut ends) + center pill.
 * Static file: `/blackbox-invoice-mark.svg`.
 */
export function BlackBoxInvoiceMark({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="BlackBox"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="butt"
        strokeLinejoin="round"
      >
        <path d="M22 46 V24 H46" />
        <path d="M54 24 H78 V46" />
        <path d="M78 54 V76 H54" />
        <path d="M46 76 H22 V54" />
      </g>
      <rect x="35" y="42" width="30" height="16" rx="8" fill="currentColor" />
    </svg>
  );
}

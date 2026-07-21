import React from 'react';

/** Corner-bracket mark matching BlackBox letterhead invoices. */
export function BlackBoxInvoiceMark({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 72 72"
      className={className}
      role="img"
      aria-label="BlackBox"
    >
      {/* Four corner brackets */}
      <path
        d="M14 28V16c0-1.1.9-2 2-2h12M44 14h12c1.1 0 2 .9 2 2v12M58 44v12c0 1.1-.9 2-2 2H44M28 58H16c-1.1 0-2-.9-2-2V44"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Center capsule */}
      <rect x="24" y="31" width="24" height="10" rx="5" fill="currentColor" />
    </svg>
  );
}

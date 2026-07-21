import React from 'react';

/** Corner-bracket mark matching BlackBox letterhead invoices. */
export function BlackBoxInvoiceMark({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 88 88"
      className={className}
      role="img"
      aria-label="BlackBox"
    >
      {/* Thick corner brackets like the store letterhead */}
      <path
        d="M20 36V20c0-2.8 2.2-5 5-5h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      <path
        d="M47 15h16c2.8 0 5 2.2 5 5v16"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      <path
        d="M68 52v16c0 2.8-2.2 5-5 5H47"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      <path
        d="M41 73H25c-2.8 0-5-2.2-5-5V52"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      <rect x="30" y="38" width="28" height="12" rx="6" fill="currentColor" />
    </svg>
  );
}

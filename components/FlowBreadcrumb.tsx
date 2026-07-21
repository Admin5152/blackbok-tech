import React from 'react';
import { Link } from '@tanstack/react-router';

export type FlowBreadcrumbItem = {
  label: string;
  /** When set, renders as a link; otherwise plain text (current step). */
  to?: string;
};

interface FlowBreadcrumbProps {
  items: FlowBreadcrumbItem[];
  className?: string;
}

/**
 * Compact trail for multi-step flows (trade-in, repair).
 * Sentence case; current step is not a link.
 */
export const FlowBreadcrumb: React.FC<FlowBreadcrumbProps> = ({
  items,
  className = '',
}) => {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs tracking-wide ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <span className="opacity-30 select-none" aria-hidden>
                /
              </span>
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="opacity-50 hover:opacity-100 hover:text-[#CDA032] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? 'text-[#CDA032] font-medium' : 'opacity-50'}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

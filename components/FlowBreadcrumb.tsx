import React from 'react';
import { Link } from '@tanstack/react-router';

export type FlowBreadcrumbItem = {
  label: string;
  /** When set, renders as a link; otherwise plain text (current step). */
  to?: string;
  /** Prefer for in-app search/state navigation (shop refine trail). */
  onClick?: () => void;
};

interface FlowBreadcrumbProps {
  items: FlowBreadcrumbItem[];
  className?: string;
}

/**
 * Compact trail for multi-step flows (shop, trade-in, repair).
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
      className={`bb-store-breadcrumb flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] sm:text-xs tracking-wide ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const canNavigate = !isLast && Boolean(item.onClick || item.to);
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <span className="opacity-30 select-none" aria-hidden>
                /
              </span>
            )}
            {canNavigate && item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                className="opacity-50 hover:opacity-100 hover:text-[#CDA032] transition-colors"
              >
                {item.label}
              </button>
            ) : canNavigate && item.to ? (
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

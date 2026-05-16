import React from 'react';

export type BrandLogoId =
  | 'Apple'
  | 'Samsung'
  | 'Google'
  | 'Sony'
  | 'Microsoft'
  | 'Nintendo'
  | 'Dell'
  | 'HP'
  | 'Lenovo'
  | 'Other';

const BRAND_IDS = new Set<string>([
  'Apple',
  'Samsung',
  'Google',
  'Sony',
  'Microsoft',
  'Nintendo',
  'Dell',
  'HP',
  'Lenovo',
  'Other',
]);

const ALIAS: Record<string, BrandLogoId> = {
  apple: 'Apple',
  samsung: 'Samsung',
  google: 'Google',
  sony: 'Sony',
  microsoft: 'Microsoft',
  nintendo: 'Nintendo',
  dell: 'Dell',
  hp: 'HP',
  lenovo: 'Lenovo',
  other: 'Other',
};

export function normalizeBrandLogoId(brand: string): BrandLogoId {
  const trimmed = brand.trim();
  if (BRAND_IDS.has(trimmed)) return trimmed as BrandLogoId;
  const lower = trimmed.toLowerCase();
  return ALIAS[lower] ?? 'Other';
}

type Props = {
  brand: string;
  className?: string;
  title?: string;
};

const svgBase = 'block h-full w-auto max-w-full';

function LogoApple() {
  return (
    <svg viewBox="0 0 24 24" className={svgBase} aria-hidden fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function LogoSamsung() {
  return (
    <svg viewBox="0 0 160 28" className={svgBase} aria-hidden>
      <text
        x="0"
        y="22"
        fill="currentColor"
        fontFamily="'Samsung Sharp Sans', 'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="22"
        fontWeight="700"
        letterSpacing="0.14em"
      >
        SAMSUNG
      </text>
    </svg>
  );
}

function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className={svgBase} aria-hidden>
      <path
        fill="#4285F4"
        d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path fill="#34A853" d="M8.3 14.7l6.6 4.8C16.5 16.1 20 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.6 4 24 4 16.1 4 9.3 8.4 6.1 14.7z" />
      <path fill="#FBBC05" d="M24 44c5.4 0 9.9-1.8 13.2-4.8l-6.1-5c-1.8 1.2-4.1 1.9-7.1 1.9-5.4 0-9.9-3.3-11.5-7.9l-6.6 5.1C9.3 39.6 16.1 44 24 44z" />
      <path fill="#EA4335" d="M12.5 28.1c-.4-1.2-.6-2.5-.6-4.1s.2-2.9.6-4.1L6.1 14.7C4.4 17.9 3.2 21.8 3.2 24s1.2 6.1 3.9 9.3l6.4-5.2z" />
    </svg>
  );
}

function LogoSony() {
  return (
    <svg viewBox="0 0 80 20" className={svgBase} aria-hidden>
      <text
        x="0"
        y="16"
        fill="currentColor"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="17"
        fontWeight="700"
        letterSpacing="0.2em"
      >
        SONY
      </text>
    </svg>
  );
}

function LogoMicrosoft() {
  return (
    <svg viewBox="0 0 48 48" className={svgBase} aria-hidden>
      <rect x="4" y="4" width="18" height="18" fill="#F25022" />
      <rect x="26" y="4" width="18" height="18" fill="#7FBA00" />
      <rect x="4" y="26" width="18" height="18" fill="#00A4EF" />
      <rect x="26" y="26" width="18" height="18" fill="#FFB900" />
    </svg>
  );
}

function LogoNintendo() {
  return (
    <svg viewBox="0 0 120 32" className={svgBase} aria-hidden>
      <rect x="1" y="6" width="118" height="20" rx="10" fill="currentColor" opacity="0.15" />
      <text
        x="60"
        y="21"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.06em"
      >
        NINTENDO
      </text>
    </svg>
  );
}

function LogoDell() {
  return (
    <svg viewBox="0 0 72 20" className={svgBase} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="10"
        y="14"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="800"
        fontStyle="italic"
      >
        D
      </text>
      <text
        x="26"
        y="15"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="14"
        fontWeight="700"
        letterSpacing="0.04em"
      >
        DELL
      </text>
    </svg>
  );
}

function LogoHp() {
  return (
    <svg viewBox="0 0 48 48" className={svgBase} aria-hidden>
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
        fontStyle="italic"
      >
        hp
      </text>
    </svg>
  );
}

function LogoLenovo() {
  return (
    <svg viewBox="0 0 100 20" className={svgBase} aria-hidden>
      <text
        x="0"
        y="16"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.08em"
      >
        LENOVO
      </text>
    </svg>
  );
}

function LogoOther() {
  return (
    <svg viewBox="0 0 48 48" className={svgBase} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="6" width="32" height="36" rx="4" />
      <circle cx="24" cy="36" r="2" fill="currentColor" stroke="none" />
      <path d="M16 12h16M16 18h10" strokeLinecap="round" />
    </svg>
  );
}

const LOGO_MAP: Record<BrandLogoId, () => React.ReactElement> = {
  Apple: LogoApple,
  Samsung: LogoSamsung,
  Google: LogoGoogle,
  Sony: LogoSony,
  Microsoft: LogoMicrosoft,
  Nintendo: LogoNintendo,
  Dell: LogoDell,
  HP: LogoHp,
  Lenovo: LogoLenovo,
  Other: LogoOther,
};

export const BrandLogo: React.FC<Props> = ({ brand, className = '', title }) => {
  const id = normalizeBrandLogoId(brand);
  const Logo = LOGO_MAP[id];
  const label = title ?? id;

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={label}
    >
      <Logo />
    </span>
  );
};

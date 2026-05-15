import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import { SUPPORT_PHONE_TEL, whatsAppUrl } from '../lib/contact';

interface FloatingShareMenuProps {
  phoneNumber?: string;
  theme?: 'light' | 'dark';
  hasNotification?: boolean;
}

// 4 socials spread 90°→270° (upper-left arc) so nothing clips off the right/bottom edge
const SOCIALS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    href: whatsAppUrl(),
    color: '#25D366',
    angle: 270, // straight up
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.875L0 24l6.324-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.724.888.921-3.617-.234-.372A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    href: 'https://x.com',
    color: '#000000',
    angle: 225, // upper-left diagonal
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.254 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    href: 'https://facebook.com',
    color: '#1877F2',
    angle: 180, // straight left
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com',
    color: '#E4405F',
    angle: 135, // lower-left diagonal
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
];

const RADIUS = 88;

export const FloatingWhatsApp: React.FC<FloatingShareMenuProps> = ({
  phoneNumber = SUPPORT_PHONE_TEL,
  hasNotification = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        @keyframes bb-pop-in {
          0%   { transform: translate(var(--tx-0), var(--ty-0)) scale(0.3); opacity: 0; }
          60%  { transform: translate(var(--tx), var(--ty)) scale(1.15); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
        }
        @keyframes bb-pop-out {
          0%   { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
          100% { transform: translate(0px, 0px) scale(0.3); opacity: 0; }
        }
        @keyframes bb-spin-open {
          from { transform: rotate(0deg); }
          to   { transform: rotate(405deg); }
        }
        @keyframes bb-spin-close {
          from { transform: rotate(405deg); }
          to   { transform: rotate(0deg); }
        }
        .bb-toggle-open  { animation: bb-spin-open  0.45s cubic-bezier(.34,1.56,.64,1) forwards; }
        .bb-toggle-close { animation: bb-spin-close 0.35s ease forwards; }
        .bb-item-open    { animation: bb-pop-in  0.45s cubic-bezier(.34,1.56,.64,1) forwards; }
        .bb-item-close   { animation: bb-pop-out 0.25s ease forwards; }
      `}</style>

      {/* ── Widget container — change bottom/right here to reposition ── */}
      <div className="fixed z-[100]" style={{ bottom: '90px', right: '32px', width: 60, height: 60 }}>

        {/* Backdrop — tap outside to close */}
        {open && (
          <div
            className="fixed inset-0 z-[-1]"
            style={{ backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.12)' }}
            onClick={() => setOpen(false)}
          />
        )}

        {/* Radial social icons */}
        {SOCIALS.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * RADIUS;
          const ty = -Math.sin(rad) * RADIUS; // CSS Y axis is flipped
          const delay = open ? i * 35 : (SOCIALS.length - 1 - i) * 22;

          return (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              title={s.label}
              onClick={e => { if (!open) e.preventDefault(); }}
              className={`absolute flex items-center justify-center rounded-full ${open ? 'bb-item-open pointer-events-auto' : 'bb-item-close pointer-events-none'}`}
              style={{
                width: 46,
                height: 46,
                top: '50%',
                left: '50%',
                marginTop: -23,
                marginLeft: -23,
                background: '#ffffff',
                color: s.color,
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
                '--tx-0': '0px',
                '--ty-0': '0px',
                animationDelay: `${delay}ms`,
                animationFillMode: 'both',
                zIndex: 10,
                boxShadow: open
                  ? `0 4px 16px ${s.color}55, 0 2px 6px rgba(0,0,0,0.1)`
                  : '0 2px 8px rgba(0,0,0,0.15)',
              } as React.CSSProperties}
            >
              {s.icon}
            </a>
          );
        })}

        {/* Central toggle button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="absolute flex items-center justify-center rounded-full bg-white text-gray-700 cursor-pointer select-none"
          style={{
            width: 60,
            height: 60,
            top: '50%',
            left: '50%',
            marginTop: -30,
            marginLeft: -30,
            zIndex: 20,
            boxShadow: open
              ? '0 6px 24px rgba(0,0,0,0.2), 0 0 0 2px #e5e5e5'
              : '0 4px 20px rgba(0,0,0,0.18)',
          }}
        >
          <span
            className={open ? 'bb-toggle-open' : 'bb-toggle-close'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Phone size={24} strokeWidth={2.2} />
          </span>

          {/* Gold pulse ring when closed */}
          {!open && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(205,160,50,0.2)', animationDuration: '2.2s' }}
            />
          )}

          {/* Notification indicator dot — shows when any toast/notification is active */}
          {hasNotification && !open && (
            <>
              <span
                className="absolute rounded-full"
                style={{
                  top: 4,
                  right: 4,
                  width: 14,
                  height: 14,
                  background: '#EF4444',
                  border: '2px solid #ffffff',
                  zIndex: 30,
                  boxShadow: '0 2px 6px rgba(239,68,68,0.6)',
                }}
                aria-label="Active notification"
              />
              <span
                className="absolute rounded-full animate-ping"
                style={{
                  top: 4,
                  right: 4,
                  width: 14,
                  height: 14,
                  background: 'rgba(239,68,68,0.6)',
                  zIndex: 25,
                  animationDuration: '1.6s',
                }}
              />
            </>
          )}
        </button>
      </div>
    </>
  );
};
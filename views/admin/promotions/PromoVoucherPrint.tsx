/**
 * Printable voucher sheet — Appendix B §5.
 * A4 portrait, 8–10 vouchers per page, cut guides, print-color-adjust exact.
 */
import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import {
  formatGHS,
  usePromotion,
  usePromotionCodes,
} from '../../../lib/promotions';
import {
  buildPromoWhatsAppText,
  buildPromoWhatsAppUrl,
  deriveCodeStatus,
  downloadPromoCodesCsv,
  effectiveCodeExpiry,
  formatPromoDate,
  promoValueLabel,
} from './promoAdminShared';

export { buildPromoWhatsAppText, buildPromoWhatsAppUrl };

const VOUCHERS_PER_PAGE = 9; // 3×3 on A4 — within 8–10

export const PromoVoucherPrint: React.FC = () => {
  const { theme } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { promoId?: string };
  const promoId = params.promoId;

  const { data: promo, isLoading: promoLoading } = usePromotion(promoId);
  const { data: codes = [], isLoading: codesLoading } = usePromotionCodes(promoId);

  const valueLabel = promo ? promoValueLabel(promo) : '';
  const pages = useMemo(() => {
    const chunks: typeof codes[] = [];
    for (let i = 0; i < codes.length; i += VOUCHERS_PER_PAGE) {
      chunks.push(codes.slice(i, i + VOUCHERS_PER_PAGE));
    }
    return chunks.length ? chunks : [[]];
  }, [codes]);

  const muted = isLight ? 'text-black/55' : 'text-white/55';
  const fg = isLight ? 'text-black' : 'text-white';

  if (promoLoading || codesLoading) {
    return <p className={`text-sm ${muted}`}>Loading print sheet…</p>;
  }
  if (!promo) {
    return (
      <div className="space-y-3">
        <p className={`text-sm ${muted}`}>Promotion not found.</p>
        <button
          type="button"
          onClick={() => void navigate({ to: '/admin/promotions' as any })}
          className="text-xs font-medium text-[#B38B21]"
        >
          Back to list
        </button>
      </div>
    );
  }

  const terms =
    promo.description?.trim() ||
    'Valid at BlackBox. One code per order unless stated. Cannot combine with other offers.';

  return (
    <div className="promo-print-root">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: white !important; }
          .promo-print-chrome { display: none !important; }
          .promo-print-page {
            break-after: page;
            page-break-after: always;
            width: 100%;
          }
          .promo-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .promo-voucher {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            box-decoration-break: clone;
          }
          .promo-print-grid {
            gap: 0 !important;
          }
        }
        .promo-print-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
        }
        .promo-voucher {
          border: 1px dashed #B38B21;
          padding: 10mm 6mm;
          min-height: 78mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #fff;
          color: #111;
          overflow: visible;
        }
        .promo-voucher-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.04em;
          word-break: break-all;
        }
      `}</style>

      <div className="promo-print-chrome flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/promotions/$promoId"
            params={{ promoId: promo.id } as any}
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${muted} hover:text-[#B38B21]`}
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <h2 className={`text-sm font-medium ${fg}`}>Print sheet · {promo.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadPromoCodesCsv(
                codes,
                (c) => deriveCodeStatus(c, promo.ends_at),
                `${promo.name.replace(/\s+/g, '-').toLowerCase()}-codes.csv`,
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
              isLight
                ? 'border-black/10 text-black/70 hover:bg-black/5'
                : 'border-white/10 text-white/70 hover:bg-white/5'
            }`}
          >
            <Download size={14} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#B38B21] px-3.5 py-2 text-xs font-medium text-black hover:brightness-110"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {pages.map((pageCodes, pageIdx) => (
        <div key={pageIdx} className="promo-print-page mb-6 print:mb-0">
          <div className="promo-print-grid">
            {pageCodes.map((code) => {
              const expiryIso = effectiveCodeExpiry(code, promo.ends_at);
              return (
                <article key={code.id} className="promo-voucher">
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#B38B21',
                        marginBottom: 8,
                      }}
                    >
                      BlackBox
                    </p>
                    <p className="promo-voucher-code">{code.code}</p>
                    <p style={{ fontSize: 18, fontWeight: 500, marginTop: 10 }}>{valueLabel}</p>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                      Min spend {formatGHS(promo.min_order_pesewas)}
                    </p>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                      Expires {formatPromoDate(expiryIso)}
                    </p>
                  </div>
                  <p style={{ fontSize: 10, color: '#666', lineHeight: 1.35, marginTop: 8 }}>
                    {terms.length > 140 ? `${terms.slice(0, 137)}…` : terms}
                  </p>
                </article>
              );
            })}
            {/* Fill empty cells so cut guides stay aligned */}
            {Array.from({ length: Math.max(0, VOUCHERS_PER_PAGE - pageCodes.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="promo-voucher"
                  style={{ borderStyle: 'dotted', opacity: 0.35 }}
                  aria-hidden
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/** Open WhatsApp share for a single code (used by Codes tab Share). */
export function sharePromoCodeOnWhatsApp(args: {
  code: string;
  valueLabel: string;
  minOrderPesewas: number;
  expiryLabel: string;
}): void {
  const text = buildPromoWhatsAppText(args);
  window.open(buildPromoWhatsAppUrl(text), '_blank', 'noopener,noreferrer');
}

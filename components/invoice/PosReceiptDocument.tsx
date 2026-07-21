/**
 * 80mm thermal / POS mini-printer receipt layout.
 * Designed for ~72mm printable width; no clipped borders under @media print.
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  formatInvoiceMoney,
  formatInvoiceNumber,
  INVOICE_COMPANY,
} from '../../lib/invoiceFormat';

export type PosLine = {
  name: string;
  qty: number;
  rate: number;
  description?: string;
};

export type PosReceiptDocumentProps = {
  kindLabel?: string;
  invoiceId: string;
  displayId?: string | null;
  customerName: string;
  customerLines?: string[];
  dateLabel: string;
  items: PosLine[];
  subTotal: number;
  discount?: number;
  shipping?: number;
  total: number;
  paymentLabel?: string;
  notes?: string | null;
  onBack: () => void;
  onPrint: () => void;
};

export const PosReceiptDocument: React.FC<PosReceiptDocumentProps> = ({
  kindLabel = 'Receipt',
  invoiceId,
  displayId,
  customerName,
  customerLines = [],
  dateLabel,
  items,
  subTotal,
  discount = 0,
  shipping = 0,
  total,
  paymentLabel,
  notes,
  onBack,
  onPrint,
}) => {
  const invNo = formatInvoiceNumber(displayId, invoiceId);

  return (
    <div className="pos-receipt-page min-h-screen bg-neutral-200 text-black print:bg-white">
      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-black/10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium opacity-70 hover:opacity-100"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-2 rounded-lg bg-black text-white text-xs font-medium uppercase tracking-wider"
        >
          Print
        </button>
      </div>

      <div className="flex justify-center py-6 print:py-0">
        <article className="pos-receipt-ticket bg-white text-black shadow-md print:shadow-none">
          <header className="text-center border-b border-dashed border-black/40 pb-3 mb-3">
            <p className="text-[15px] font-bold tracking-wide uppercase">
              {INVOICE_COMPANY.legalName}
            </p>
            {INVOICE_COMPANY.lines.map((line) => (
              <p key={line} className="text-[10px] opacity-70">
                {line}
              </p>
            ))}
            {INVOICE_COMPANY.email && (
              <p className="text-[10px] opacity-70">{INVOICE_COMPANY.email}</p>
            )}
            <p className="text-[11px] mt-2 font-medium uppercase tracking-wider">
              {kindLabel}
            </p>
          </header>

          <div className="text-[11px] space-y-0.5 mb-3">
            <div className="flex justify-between gap-2">
              <span className="opacity-60">No.</span>
              <span className="font-mono font-medium text-right break-all">{invNo}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="opacity-60">Date</span>
              <span className="text-right">{dateLabel}</span>
            </div>
            {paymentLabel && (
              <div className="flex justify-between gap-2">
                <span className="opacity-60">Pay</span>
                <span className="text-right">{paymentLabel}</span>
              </div>
            )}
          </div>

          <div className="border-t border-b border-dashed border-black/40 py-2 mb-3 text-[11px]">
            <p className="font-medium">{customerName}</p>
            {customerLines.map((line) => (
              <p key={line} className="opacity-70 break-words">
                {line}
              </p>
            ))}
          </div>

          <table className="w-full text-[11px] mb-3 border-collapse">
            <thead>
              <tr className="border-b border-black/30 text-left">
                <th className="py-1 font-medium">Item</th>
                <th className="py-1 font-medium text-right w-8">Qty</th>
                <th className="py-1 font-medium text-right w-16">Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`${item.name}-${i}`} className="align-top">
                  <td className="py-1.5 pr-1">
                    <span className="font-medium uppercase leading-snug block">
                      {item.name}
                    </span>
                    {item.description && (
                      <span className="opacity-60 text-[10px] block leading-snug">
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono">{item.qty}</td>
                  <td className="py-1.5 text-right font-mono">
                    {formatInvoiceMoney(item.rate * item.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-black/40 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="opacity-60">Subtotal</span>
              <span className="font-mono">{formatInvoiceMoney(subTotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="opacity-60">Discount</span>
                <span className="font-mono">−{formatInvoiceMoney(discount)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between">
                <span className="opacity-60">Delivery</span>
                <span className="font-mono">{formatInvoiceMoney(shipping)}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px] font-bold pt-1 border-t border-black/30">
              <span>Total</span>
              <span className="font-mono">{formatInvoiceMoney(total)}</span>
            </div>
          </div>

          {notes && (
            <p className="mt-3 text-[10px] opacity-70 break-words border-t border-dashed border-black/30 pt-2">
              {notes}
            </p>
          )}

          <p className="mt-4 text-center text-[10px] opacity-50">Thank you</p>
        </article>
      </div>

      <style>{`
        .pos-receipt-ticket {
          width: 72mm;
          max-width: 100%;
          padding: 4mm 3.5mm;
          box-sizing: border-box;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .pos-receipt-page {
            background: #fff !important;
            min-height: 0 !important;
          }
          .pos-receipt-ticket {
            width: 72mm !important;
            max-width: 72mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto;
            overflow: visible !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

import React from 'react';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { BlackBoxInvoiceMark } from './BlackBoxInvoiceMark';
import {
  INVOICE_COMPANY,
  formatInvoiceMoney,
  formatInvoiceNumber,
  formatInvoicePlain,
  formatInvoiceQty,
} from '../../lib/invoiceFormat';

export type InvoiceLineItem = {
  name: string;
  description?: string;
  qty: number;
  rate: number;
};

export type InvoiceTotals = {
  subTotal: number;
  /** Trade-in credit or other discount (shown as negative). */
  adjustment?: number;
  adjustmentLabel?: string;
  shipping?: number;
  total: number;
  paymentMade?: number;
  balanceDue: number;
};

export type InvoiceMeta = {
  invoiceDate: string;
  dueDate?: string;
  terms?: string;
};

export type InvoiceDocumentProps = {
  /** Document kind label under INVOICE (optional subtitle). */
  kindLabel?: string;
  invoiceId: string;
  displayId?: string | null;
  billToName: string;
  billToLines?: string[];
  meta: InvoiceMeta;
  items: InvoiceLineItem[];
  totals: InvoiceTotals;
  notes?: string | null;
  extraNotes?: React.ReactNode;
  onBack: () => void;
  onPrint: () => void;
  onShare?: () => void;
};

/**
 * Printable customer invoice — white letterhead matching BlackBox store invoices.
 * These are invoices (not final fiscal receipts).
 */
export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  kindLabel,
  invoiceId,
  displayId,
  billToName,
  billToLines = [],
  meta,
  items,
  totals,
  notes,
  extraNotes,
  onBack,
  onPrint,
  onShare,
}) => {
  const invNo = formatInvoiceNumber(displayId, invoiceId);
  const balance = totals.balanceDue;
  const paymentMade = totals.paymentMade ?? 0;
  const adjustment = totals.adjustment ?? 0;
  const shipping = totals.shipping ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-200 text-black print:min-h-0 print:bg-white">
      <div className="no-print border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-4 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-black/60 hover:text-black"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-2">
            {onShare ? (
              <button
                type="button"
                onClick={onShare}
                className="rounded-lg border border-black/10 bg-black/[0.04] p-2 hover:bg-black/[0.08]"
                aria-label="Share invoice"
              >
                <Share2 size={18} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onPrint}
              className="rounded-lg bg-[#1a1a1a] p-2 text-white hover:bg-black"
              aria-label="Print or save PDF"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[820px] flex-1 px-3 py-4 print:max-w-none print:px-0 print:py-0">
        <article
          id="invoice-content"
          className="receipt-print-root invoice-print-root bg-white px-6 py-7 shadow-sm sm:px-10 sm:py-9 print:px-6 print:py-4 print:shadow-none"
        >
          {/* Header: logo + INVOICE */}
          <header className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <BlackBoxInvoiceMark className="h-14 w-14 text-black sm:h-16 sm:w-16" />
              <div className="mt-5 space-y-0.5 text-[11px] leading-relaxed text-black/80 sm:text-xs">
                <p className="font-bold uppercase tracking-wide text-black">{INVOICE_COMPANY.legalName}</p>
                {INVOICE_COMPANY.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>{INVOICE_COMPANY.email}</p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">INVOICE</h1>
              {kindLabel ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                  {kindLabel}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-black/70">{invNo}</p>
              <div className="mt-5">
                <p className="text-xs text-black/55">Balance Due</p>
                <p className="text-lg font-bold tabular-nums text-black sm:text-xl">
                  {formatInvoiceMoney(balance)}
                </p>
              </div>
            </div>
          </header>

          {/* Bill To + dates */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-black/50">Bill To</p>
              <p className="mt-1 text-sm font-bold text-black">{billToName}</p>
              {billToLines.map((line) => (
                <p key={line} className="text-xs leading-relaxed text-black/70">
                  {line}
                </p>
              ))}
            </div>
            <div className="sm:text-right">
              <dl className="inline-grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-xs sm:text-sm">
                <dt className="text-black/50">Invoice Date</dt>
                <dd className="font-medium text-black">{meta.invoiceDate}</dd>
                <dt className="text-black/50">Terms</dt>
                <dd className="font-medium text-black">{meta.terms || 'Due on Receipt'}</dd>
                <dt className="text-black/50">Due Date</dt>
                <dd className="font-medium text-black">{meta.dueDate || meta.invoiceDate}</dd>
              </dl>
            </div>
          </div>

          {/* Line items */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#4a4a4a] text-[10px] font-semibold uppercase tracking-wider text-white sm:text-[11px]">
                  <th className="w-10 px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Item &amp; Description</th>
                  <th className="w-24 px-3 py-2.5 text-right font-semibold">Qty</th>
                  <th className="w-28 px-3 py-2.5 text-right font-semibold">Rate</th>
                  <th className="w-28 px-3 py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-black/45">
                      No line items on this invoice.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} className="border-b border-black/10 align-top">
                      <td className="px-3 py-3 tabular-nums text-black/70">{index + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-bold uppercase tracking-wide text-black">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-[11px] leading-snug text-black/55">{item.description}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-black/80">
                        {formatInvoiceQty(item.qty)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-black/80">
                        {formatInvoicePlain(item.rate)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-black">
                        {formatInvoicePlain(item.rate * item.qty)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between gap-8">
                <dt className="text-black/55">Sub Total</dt>
                <dd className="tabular-nums text-black">{formatInvoicePlain(totals.subTotal)}</dd>
              </div>
              {shipping > 0 ? (
                <div className="flex justify-between gap-8">
                  <dt className="text-black/55">Shipping</dt>
                  <dd className="tabular-nums text-black">{formatInvoicePlain(shipping)}</dd>
                </div>
              ) : null}
              {adjustment > 0 ? (
                <div className="flex justify-between gap-8">
                  <dt className="text-black/55">{totals.adjustmentLabel || 'Adjustment'}</dt>
                  <dd className="tabular-nums text-black">(-) {formatInvoicePlain(adjustment)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-8 border-t border-black/10 pt-2">
                <dt className="font-semibold text-black">Total</dt>
                <dd className="font-bold tabular-nums text-black">{formatInvoiceMoney(totals.total)}</dd>
              </div>
              {paymentMade > 0 ? (
                <div className="flex justify-between gap-8">
                  <dt className="text-black/55">Payment Made</dt>
                  <dd className="tabular-nums font-medium text-red-600">
                    (-) {formatInvoicePlain(paymentMade)}
                  </dd>
                </div>
              ) : null}
              <div className="mt-1 flex justify-between gap-8 rounded-sm bg-[#ececec] px-3 py-2.5">
                <dt className="font-bold text-black">Balance Due</dt>
                <dd className="font-bold tabular-nums text-black">{formatInvoiceMoney(balance)}</dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          <div className="mt-10">
            <p className="text-sm font-semibold text-black">Notes</p>
            <div className="mt-2 min-h-[2.5rem] text-xs leading-relaxed text-black/70 whitespace-pre-wrap">
              {notes?.trim() ? notes : null}
              {extraNotes}
            </div>
          </div>

          <p className="mt-8 text-sm text-black/70">Thank you for your business.</p>

          <footer className="mt-10 flex items-end justify-between border-t border-black/10 pt-4 text-[10px] text-black/40">
            <p>BlackBox Technologies Ghana · Invoice (not a final fiscal receipt)</p>
            <p>1</p>
          </footer>
        </article>
      </div>
    </div>
  );
};

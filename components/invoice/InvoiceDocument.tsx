import React from 'react';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { BlackBoxInvoiceMark } from './BlackBoxInvoiceMark';
import {
  INVOICE_COMPANY,
  formatInvoiceMoney,
  formatInvoiceNumber,
  formatInvoicePlain,
  formatInvoiceQty,
  formatInvoiceGhcPlain,
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

export type TradeInValuationLine = {
  label: string;
  amount: number;
};

export type InvoiceDocumentProps = {
  kindLabel?: string;
  invoiceId: string;
  displayId?: string | null;
  billToName: string;
  billToLines?: string[];
  meta: InvoiceMeta;
  items: InvoiceLineItem[];
  totals: InvoiceTotals;
  notes?: string | null;
  tradeInValuation?: TradeInValuationLine[];
  onBack: () => void;
  onPrint: () => void;
  onShare?: () => void;
};

/**
 * Printable customer invoice matching BlackBox letterhead (Zoho-style).
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
  tradeInValuation,
  onBack,
  onPrint,
  onShare,
}) => {
  const invNo = formatInvoiceNumber(displayId, invoiceId);
  const balance = totals.balanceDue;
  const paymentMade = totals.paymentMade ?? 0;
  const adjustment = totals.adjustment ?? 0;
  const shipping = totals.shipping ?? 0;
  const tradeInTotal =
    tradeInValuation?.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) ?? 0;

  return (
    <div className="bb-invoice-shell flex min-h-0 flex-1 flex-col bg-[#dcdcdc] text-black print:min-h-0 print:bg-white">
      <div className="no-print border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-4 py-2.5">
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
              className="rounded-lg bg-[#222] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-black"
              aria-label="Print or save PDF"
            >
              <span className="inline-flex items-center gap-1.5">
                <Download size={16} />
                Print / PDF
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[760px] flex-1 px-3 py-5 print:max-w-none print:px-0 print:py-0">
        <article
          id="invoice-content"
          className="bb-invoice receipt-print-root invoice-print-root bg-white px-8 py-9 shadow-sm sm:px-12 sm:py-11 print:px-10 print:py-6 print:shadow-none"
        >
          <header className="bb-invoice__header flex items-start justify-between gap-6">
            <div className="min-w-0">
              <BlackBoxInvoiceMark className="bb-invoice__mark h-16 w-16 text-black" />
              <div className="bb-invoice__company mt-5">
                <p className="bb-invoice__company-name">{INVOICE_COMPANY.legalName}</p>
                {INVOICE_COMPANY.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>{INVOICE_COMPANY.email}</p>
              </div>
            </div>

            <div className="bb-invoice__title-block shrink-0 text-right">
              <h1 className="bb-invoice__title">INVOICE</h1>
              {kindLabel ? <p className="bb-invoice__kind">{kindLabel}</p> : null}
              <p className="bb-invoice__number">{invNo}</p>
              <div className="bb-invoice__balance-top">
                <p>Balance Due</p>
                <p className="bb-invoice__balance-top-amt">{formatInvoiceMoney(balance)}</p>
              </div>
            </div>
          </header>

          <div className="bb-invoice__meta mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <p className="bb-invoice__label">Bill To</p>
              <p className="bb-invoice__bill-name">{billToName}</p>
              {billToLines.map((line) => (
                <p key={line} className="bb-invoice__bill-line">
                  {line}
                </p>
              ))}
            </div>
            <div className="bb-invoice__dates sm:justify-self-end">
              <div className="bb-invoice__date-row">
                <span>Invoice Date :</span>
                <span>{meta.invoiceDate}</span>
              </div>
              <div className="bb-invoice__date-row">
                <span>Terms :</span>
                <span>{meta.terms || 'Due on Receipt'}</span>
              </div>
              <div className="bb-invoice__date-row">
                <span>Due Date :</span>
                <span>{meta.dueDate || meta.invoiceDate}</span>
              </div>
            </div>
          </div>

          <div className="bb-invoice__table-wrap mt-8 overflow-x-auto">
            <table className="bb-invoice__table">
              <thead>
                <tr>
                  <th className="bb-invoice__th-num">#</th>
                  <th>Item &amp; Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="bb-invoice__empty">
                      No line items on this invoice.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index}>
                      <td className="bb-invoice__td-num">{index + 1}</td>
                      <td>
                        <p className="bb-invoice__item-name">{item.name}</p>
                        {item.description ? (
                          <p className="bb-invoice__item-desc">{item.description}</p>
                        ) : null}
                      </td>
                      <td className="text-right tabular-nums">{formatInvoiceQty(item.qty)}</td>
                      <td className="text-right tabular-nums">{formatInvoicePlain(item.rate)}</td>
                      <td className="text-right tabular-nums font-medium">
                        {formatInvoicePlain(item.rate * item.qty)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bb-invoice__totals mt-6 flex justify-end">
            <dl className="bb-invoice__totals-box">
              <div className="bb-invoice__tot-row">
                <dt>Sub Total</dt>
                <dd>{formatInvoicePlain(totals.subTotal)}</dd>
              </div>
              {shipping > 0 ? (
                <div className="bb-invoice__tot-row">
                  <dt>Shipping</dt>
                  <dd>{formatInvoicePlain(shipping)}</dd>
                </div>
              ) : null}
              {adjustment > 0 ? (
                <div className="bb-invoice__tot-row">
                  <dt>{totals.adjustmentLabel || 'Adjustment'}</dt>
                  <dd>(-) {formatInvoicePlain(adjustment)}</dd>
                </div>
              ) : null}
              <div className="bb-invoice__tot-row bb-invoice__tot-row--strong">
                <dt>Total</dt>
                <dd>{formatInvoiceMoney(totals.total)}</dd>
              </div>
              {paymentMade > 0 ? (
                <div className="bb-invoice__tot-row">
                  <dt>Payment Made</dt>
                  <dd className="bb-invoice__paid">(-) {formatInvoicePlain(paymentMade)}</dd>
                </div>
              ) : null}
              <div className="bb-invoice__balance-bar">
                <span>Balance Due</span>
                <span>{formatInvoiceMoney(balance)}</span>
              </div>
            </dl>
          </div>

          <div className="bb-invoice__notes mt-11">
            <p className="bb-invoice__notes-title">Notes</p>
            <div className="bb-invoice__notes-body">{notes?.trim() ? notes : '\u00a0'}</div>
          </div>

          {tradeInValuation && tradeInValuation.length > 0 ? (
            <div className="bb-invoice__trade mt-9">
              <p className="bb-invoice__trade-title">TRADE IN VALUATION;</p>
              <ul>
                {tradeInValuation.map((row) => (
                  <li key={row.label}>
                    {row.label}: GHC {formatInvoiceGhcPlain(row.amount)}
                  </li>
                ))}
              </ul>
              <p className="bb-invoice__trade-total">
                TOTAL: GHC {formatInvoiceGhcPlain(tradeInTotal)}
              </p>
            </div>
          ) : null}

          <p className="bb-invoice__thanks mt-9">Thank you for your business.</p>

          <footer className="bb-invoice__footer">
            <p>BlackBox Technologies Ghana</p>
            <p>1</p>
          </footer>
        </article>
      </div>
    </div>
  );
};

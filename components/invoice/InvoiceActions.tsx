/**
 * View / Download (print PDF) / Share for customer invoices.
 * Use on confirmation, tracking, history, profile, and settings.
 */
import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Download, FileText, Share2 } from 'lucide-react';
import { INVOICE_COPY } from '../../lib/invoiceFormat';
import {
  invoiceAbsoluteUrl,
  invoicePath,
  shareInvoiceLink,
  type InvoiceKind,
} from '../../lib/invoiceShare';

type NotifyFn = (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

export type InvoiceActionsProps = {
  kind: InvoiceKind;
  id: string;
  /** Shown in share sheet title, e.g. TRD-00012 */
  displayId?: string | null;
  /** Extra share text (device name, status, …) */
  shareText?: string;
  isLight?: boolean;
  /** Compact text links vs pill buttons */
  variant?: 'pills' | 'links' | 'stack';
  className?: string;
  notify?: NotifyFn;
  /** Hide View when the user is already on the invoice page */
  showView?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
};

const KIND_LABEL: Record<InvoiceKind, string> = {
  order: 'order',
  repair: 'repair',
  trade: 'trade-in',
};

export function InvoiceActions({
  kind,
  id,
  displayId,
  shareText,
  isLight = false,
  variant = 'pills',
  className = '',
  notify,
  showView = true,
  showDownload = true,
  showShare = true,
}: InvoiceActionsProps) {
  const [sharing, setSharing] = useState(false);
  const viewTo = invoicePath(kind, id);
  const downloadTo = invoicePath(kind, id, { print: true });
  const ref = (displayId || '').trim() || id.slice(-8).toUpperCase();

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const url = invoiceAbsoluteUrl(kind, id);
      const result = await shareInvoiceLink({
        title: `BlackBox ${KIND_LABEL[kind]} invoice ${ref}`,
        text: shareText || `BlackBox ${KIND_LABEL[kind]} invoice ${ref}`,
        url,
      });
      if (result === 'copied') {
        notify?.('Invoice link copied — paste it anywhere or open to Print / PDF.', 'success');
      } else if (result === 'failed') {
        notify?.('Could not share this invoice. Open View Invoice and use Print / PDF.', 'error');
      }
    } finally {
      setSharing(false);
    }
  };

  if (variant === 'links') {
    const linkCls =
      'text-[9px] font-black uppercase tracking-widest text-[#B38B21] border-b border-[#B38B21]/20 hover:border-[#B38B21] transition-all inline-flex items-center gap-1';
    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
        {showView ? (
          <Link to={viewTo as any} className={linkCls}>
            {INVOICE_COPY.view}
          </Link>
        ) : null}
        {showDownload ? (
          <Link to={downloadTo as any} className={linkCls}>
            <Download size={11} aria-hidden />
            {INVOICE_COPY.download}
          </Link>
        ) : null}
        {showShare ? (
          <button type="button" onClick={() => void onShare()} disabled={sharing} className={linkCls}>
            <Share2 size={11} aria-hidden />
            {sharing ? 'Sharing…' : INVOICE_COPY.share}
          </button>
        ) : null}
      </div>
    );
  }

  const pillBase =
    'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors border';
  const goldPill =
    'bg-[#CDA032]/10 text-[#CDA032] border-[#CDA032]/20 hover:bg-[#CDA032]/20';
  const quietPill = isLight
    ? 'border-black/10 text-black/70 hover:bg-black/5'
    : 'border-white/15 text-white/70 hover:bg-white/5';

  if (variant === 'stack') {
    return (
      <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
        {showView ? (
          <Link to={viewTo as any} className={`${pillBase} ${goldPill}`}>
            <FileText size={14} aria-hidden />
            {INVOICE_COPY.view}
          </Link>
        ) : null}
        {showDownload ? (
          <Link to={downloadTo as any} className={`${pillBase} ${quietPill}`}>
            <Download size={14} aria-hidden />
            {INVOICE_COPY.downloadShort}
          </Link>
        ) : null}
        {showShare ? (
          <button
            type="button"
            onClick={() => void onShare()}
            disabled={sharing}
            className={`${pillBase} ${quietPill} disabled:opacity-40`}
          >
            <Share2 size={14} aria-hidden />
            {sharing ? 'Sharing…' : INVOICE_COPY.share}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showView ? (
        <Link to={viewTo as any} className={`${pillBase} ${goldPill}`}>
          <FileText size={14} aria-hidden />
          {INVOICE_COPY.view}
        </Link>
      ) : null}
      {showDownload ? (
        <Link to={downloadTo as any} className={`${pillBase} ${quietPill}`}>
          <Download size={14} aria-hidden />
          {INVOICE_COPY.downloadShort}
        </Link>
      ) : null}
      {showShare ? (
        <button
          type="button"
          onClick={() => void onShare()}
          disabled={sharing}
          className={`${pillBase} ${quietPill} disabled:opacity-40`}
          aria-label={INVOICE_COPY.share}
        >
          <Share2 size={14} aria-hidden />
          {sharing ? '…' : INVOICE_COPY.share}
        </button>
      ) : null}
    </div>
  );
}

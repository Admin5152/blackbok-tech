/**
 * Confirm-delete dialog — soft confirm, or type "delete" for critical actions.
 */
import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

export type ConfirmDeleteOptions = {
  title?: string;
  message: string;
  /** When true, user must type the word delete to enable Confirm */
  requireTypedDelete?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Props = ConfirmDeleteOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

const DELETE_WORD = 'delete';

export function ConfirmDeleteDialog({
  open,
  title = 'Delete?',
  message,
  requireTypedDelete = false,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy = false,
}: Props) {
  const titleId = useId();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const canConfirm =
    !busy && (!requireTypedDelete || typed.trim().toLowerCase() === DELETE_WORD);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id={titleId} className="text-base font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm text-white/60 leading-relaxed">{message}</p>
          <p className="mt-2 text-xs text-white/40">Are you sure you want to delete?</p>
        </div>

        {requireTypedDelete && (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-300/90">
              Type <span className="font-mono normal-case tracking-normal">delete</span> to confirm
            </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="delete"
              autoComplete="off"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-red-400/50 focus:outline-none"
            />
          </label>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-red-500 text-white disabled:opacity-40 hover:brightness-110"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

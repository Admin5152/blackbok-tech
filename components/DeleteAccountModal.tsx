import React, { useState, useEffect } from 'react';
import { Trash2, X, AlertTriangle, Shield, Mail, Calendar, Package, Wrench, RefreshCw } from 'lucide-react';
import type { DeletionPreview } from '../lib/accountDeletionGuards';
import { formatCustomerStatusLong } from '../lib/customerStatusLabels';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password?: string) => void;
  isDeleting: boolean;
  error: string;
  password: string;
  setPassword: (password: string) => void;
  userData: DeletionPreview | null;
  requiresPassword: boolean;
  theme: 'light' | 'dark';
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  error,
  password,
  setPassword,
  userData,
  requiresPassword,
  theme
}) => {
  const isDark = theme === 'dark';
  const [acknowledgePending, setAcknowledgePending] = useState(false);
  const pending = userData?.pendingItems ?? [];
  const hasPending = pending.length > 0;

  useEffect(() => {
    if (isOpen) setAcknowledgePending(false);
  }, [isOpen, userData?.email]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresPassword) {
      onConfirm(password);
    } else {
      onConfirm();
    }
  };

  const canConfirm =
    !isDeleting &&
    (!requiresPassword || password.trim().length > 0) &&
    (!hasPending || acknowledgePending);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md mx-auto rounded-2xl border shadow-2xl p-6 ${
        isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/10'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-black/40'
          }`}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isDark ? 'bg-red-500/20' : 'bg-red-50'
          }`}>
            <Trash2 className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              Delete Account
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div className={`p-4 rounded-lg border ${
          isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
        } mb-6`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'} mb-1`}>
                Warning: This will permanently delete:
              </p>
              <ul className={`text-xs ${isDark ? 'text-white/60' : 'text-black/60'} space-y-1`}>
                <li>• Your account and profile</li>
                <li>• All order history and data</li>
                <li>• Repair requests and records</li>
                <li>• Trade-in history</li>
                <li>• Wishlist and preferences</li>
                <li>• Any stored personal information</li>
              </ul>
            </div>
          </div>
        </div>

        {hasPending && (
          <div
            className={`p-4 rounded-lg border mb-6 ${
              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
              You still have active activity on your account
            </p>
            <p className={`text-xs mb-2 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
              <strong>Finished</strong> means nothing is still in progress: order <strong>Delivered</strong> (or
              cancelled/refunded), repair <strong>finished</strong>, or trade-in <strong>fully done</strong>.{' '}
              <strong>Accepted</strong> on a trade-in is <em>not</em> initial approval — it means you already accepted
              our cash offer and we are arranging your visit; that still counts as open until the trade is{' '}
              <strong>Completed</strong>.
            </p>
            <p className={`text-xs mb-3 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
              If you continue now, these open items will be <strong>cancelled</strong> automatically:
            </p>
            <ul className={`text-xs space-y-1.5 mb-4 max-h-36 overflow-y-auto overscroll-contain ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              {pending.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2 border-b border-white/5 pb-1.5 last:border-0">
                  <span className="font-medium break-words">{item.label}</span>
                  <span className="opacity-70 text-[10px] sm:text-xs leading-snug shrink-0">
                    {formatCustomerStatusLong(item.kind, item.status)}
                  </span>
                </li>
              ))}
            </ul>
            <label className={`flex items-start gap-2 cursor-pointer text-xs ${isDark ? 'text-white/90' : 'text-black/90'}`}>
              <input
                type="checkbox"
                checked={acknowledgePending}
                onChange={(e) => setAcknowledgePending(e.target.checked)}
                className="mt-0.5 rounded border-white/30"
                disabled={isDeleting}
              />
              <span>
                I understand my open order(s), repair(s), and/or trade-in(s) will be cancelled if I delete my
                account.
              </span>
            </label>
          </div>
        )}

        {/* User Data Summary */}
        {userData && (
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
          } mb-6`}>
            <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-black'}`}>
              Account to be deleted:
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                <span className={`text-sm ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                  {userData.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                <span className={`text-sm ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                  Member since {new Date(userData.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1">
                  <Package className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    {userData.orderCount} orders
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    {userData.repairCount} repairs
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <RefreshCw className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    {userData.tradeCount} trades
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Input (if required) */}
        {requiresPassword && (
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
              Enter your password to confirm:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDark 
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-red-500 focus:outline-none' 
                  : 'bg-black/5 border-black/10 text-black placeholder-black/40 focus:border-red-500 focus:outline-none'
              }`}
              disabled={isDeleting}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`p-3 rounded-lg border mb-6 ${
            isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              {error}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-white/5 text-white hover:bg-white/10 disabled:opacity-50' 
                : 'bg-black/5 text-black hover:bg-black/10 disabled:opacity-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              !canConfirm
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete Account
              </>
            )}
          </button>
        </div>

        {!hasPending && (
          <div className={`mt-4 p-3 rounded-lg border ${
            isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <p className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

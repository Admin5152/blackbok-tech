/**
 * Hover / focus info tip for IMEI / serial help.
 * Prefer FieldInfoTip for new fields; this keeps the old import working.
 */
import React from 'react';
import { FieldInfoTip } from './FieldInfoTip';
import { TRADE_COPY } from '../../lib/tradeCopy';

export function ImeiInfoTip({ className = '' }: { className?: string }) {
  return (
    <FieldInfoTip
      className={className}
      title={TRADE_COPY.config.imeiInfoTitle}
      body={TRADE_COPY.config.imeiInfoBody}
      label={TRADE_COPY.config.imeiInfoTitle}
    />
  );
}

export { FieldInfoTip };

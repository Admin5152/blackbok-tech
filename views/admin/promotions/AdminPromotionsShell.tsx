/**
 * Admin promotions shell — Outlet under universal Admin chrome.
 * Deep links: /admin/promotions, /admin/promotions/$promoId, …/print
 */
import React from 'react';
import { Outlet } from '@tanstack/react-router';

export const AdminPromotionsShell: React.FC = () => (
  <div className="min-w-0 flex-1">
    <Outlet />
  </div>
);

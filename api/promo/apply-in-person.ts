/**
 * In-person / pay-on-pickup: apply a reserved promo after checkout.
 * POST /api/promo/apply-in-person
 *
 * Auth: Authorization: Bearer <user access token>
 * Body: { order_id: string }
 *
 * Uses the service-role key only for promo_apply (clients cannot call it).
 * Verifies the order belongs to the caller and payment is in-person / pickup.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createServiceSupabase } from '../../lib/server/webPushSend';
import { parseRequestBody } from '../../lib/server/parseRequestBody';

function bearer(req: VercelRequest): string {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const token = bearer(req);
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const anon = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      res.status(500).json({ error: 'Supabase env missing' });
      return;
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const body = parseRequestBody(req.body);
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    if (!orderId) {
      res.status(400).json({ error: 'order_id required' });
      return;
    }

    const service = createServiceSupabase(process.env);
    const { data: order, error: orderErr } = await service
      .from('orders')
      .select('id, user_id, payment_method, payment_status')
      .eq('id', orderId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) {
      res.status(404).json({ error: 'order not found' });
      return;
    }
    if (order.user_id !== userData.user.id) {
      res.status(403).json({ error: 'not your order' });
      return;
    }
    const method = String(order.payment_method || '').toLowerCase();
    if (method && method !== 'in_person' && method !== 'pickup_cash') {
      res.status(400).json({
        error: 'Only in-person / pickup orders can be finalized here.',
      });
      return;
    }

    const { data: n, error: applyErr } = await service.rpc('promo_apply', {
      p_order_id: orderId,
    });
    if (applyErr) throw applyErr;

    res.status(200).json({ ok: true, rows: n });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/promo/apply-in-person]', message);
    res.status(500).json({ error: message });
  }
}

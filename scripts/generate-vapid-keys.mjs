/**
 * Generate VAPID keys for Web Push (web-push).
 *
 *   npm run generate:vapid
 *
 * Copy the printed values into `.env` (and Vercel env vars).
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log(`
# Add these to .env (and Vercel → Environment Variables)

VITE_VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
VAPID_SUBJECT=mailto:admin@blackboxghana.com
`);

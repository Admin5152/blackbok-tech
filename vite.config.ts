import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Public customer site; used for OG/canonical in production builds if VITE_APP_URL is unset. */
const DEFAULT_PRODUCTION_ORIGIN = 'https://blackboxghana.com';

function socialMetaPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const raw = (
    env.VITE_APP_URL?.trim() ||
    (mode === 'production' ? DEFAULT_PRODUCTION_ORIGIN : '')
  ).replace(/\/$/, '');
  const siteBase = /^https?:\/\//i.test(raw) ? raw : '';
  const ogImage = siteBase ? `${siteBase}/IMG_9010.JPG` : '/IMG_9010.JPG';
  const ogUrlBlock = siteBase
    ? `  <meta property="og:url" content="${siteBase}/">\n  <link rel="canonical" href="${siteBase}/">\n`
    : '';

  return {
    name: 'html-social-meta',
    transformIndexHtml(html) {
      return html
        .replace(/<!--\s*__OG_URL_BLOCK__\s*-->/g, ogUrlBlock)
        .replace(/__OG_IMAGE__/g, ogImage);
    },
  };
}

export default defineConfig(({ mode }) => {
    const isProd = mode === 'production';
    return {
      server: {
        port: 3000,
        strictPort: true,
        host: 'localhost',
      },
      esbuild: isProd
        ? { drop: ['console', 'debugger'] as const, legalComments: 'none' }
        : undefined,
      plugins: [react(), socialMetaPlugin(mode)],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: path.resolve(__dirname, 'index.html'),
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['@tanstack/react-router'],
              supabase: ['@supabase/supabase-js'],
              icons: ['lucide-react']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      /** Root deploy (Vercel / custom domain). For GitHub Pages under a subpath, set `base` to your repo path. */
      base: '/',
    };
});

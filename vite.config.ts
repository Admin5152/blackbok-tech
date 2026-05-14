import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function socialMetaPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const raw = (env.VITE_APP_URL || '').trim().replace(/\/$/, '');
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
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
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
      base: mode === 'production' ? './' : '/'
    };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// Replace layout-thrashing `padding` transition emitted by Astryx ToastViewport collapse slots.
const stripPaddingTransitionPlugin = (): Plugin => ({
  name: 'strip-padding-transition',
  enforce: 'post',
  transform(code, id) {
    if (!id.includes('.css') || !code.includes('grid-template-rows,padding')) {
      return null;
    }
    return {
      code: code.replaceAll('transition-property:grid-template-rows,padding', 'transition-property:grid-template-rows'),
      map: null,
    };
  },
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'asset' && chunk.fileName.endsWith('.css') && typeof chunk.source === 'string') {
        chunk.source = chunk.source.replaceAll(
          'transition-property:grid-template-rows,padding',
          'transition-property:grid-template-rows',
        );
      }
    }
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [stripPaddingTransitionPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:5152',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

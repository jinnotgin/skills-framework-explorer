import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

function normalizeBasePath(path: string | undefined): string {
  if (!path) {
    return '/';
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

function normalizeRouterMode(mode: string | undefined): 'history' | 'hash' {
  return mode?.trim().toLowerCase() === 'hash' ? 'hash' : 'history';
}

export default defineConfig({
  base: normalizeBasePath(process.env.APP_BASE_PATH),
  define: {
    'import.meta.env.APP_ROUTER_MODE': JSON.stringify(normalizeRouterMode(process.env.APP_ROUTER_MODE)),
  },
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

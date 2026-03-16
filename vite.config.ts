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

export default defineConfig({
  base: normalizeBasePath(process.env.APP_BASE_PATH),
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

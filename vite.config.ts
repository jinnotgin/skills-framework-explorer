import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/skills-framework-explorer/' : '/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

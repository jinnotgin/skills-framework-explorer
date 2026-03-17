/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_ROUTER_MODE: 'history' | 'hash';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

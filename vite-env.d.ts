/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS?: string | boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

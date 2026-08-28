/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS?: string | boolean;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

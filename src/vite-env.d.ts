/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_GRAPHQL_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_GETSTREAM_API_KEY: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_APP_ENV?: string; // "staging" | "production" | undefined (dev)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

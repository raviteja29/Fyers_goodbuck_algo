/// <reference types="vite/client" />

// Fallback for environments where vite/client types aren't resolved
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Fallback declaration for lucide-react if type definitions are missing
declare module 'lucide-react';

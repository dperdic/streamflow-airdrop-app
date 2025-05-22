/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL: string;
  readonly VITE_SOL_CLUSTER: string;
  readonly VITE_DISTRIBUTOR_ADMIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

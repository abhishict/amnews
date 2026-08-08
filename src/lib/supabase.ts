import { createClient } from "@supabase/supabase-js";

// Polyfill WebSocket for Node.js environments (GitHub Actions, scripts)
if (typeof globalThis.WebSocket === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require("ws");
    globalThis.WebSocket = ws;
  } catch {
    // ws not available — will work in Node 22+ or browser
  }
}

/** Read-only client using anon key (safe for browser/SSR) */
export function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/** Admin client using service role key (server-side only) */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

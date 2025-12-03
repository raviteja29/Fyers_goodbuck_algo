import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Explicitly bind the dev server so both http://localhost:5173 and http://127.0.0.1:5173 work.
// On some Windows setups Vite (Node) will prefer IPv6 loopback (::1) for "localhost"; 127.0.0.1 then refuses.
// Setting host to true (or '0.0.0.0') forces binding on all interfaces, including IPv4 loopback.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // equivalent to 0.0.0.0; exposes on all local addresses
    port: 5173,        // keep stable; adjust if occupied
    strictPort: true,  // fail instead of auto-increment so backend redirect stays correct
    cors: true
  }
  ,
  preview: {
    // allow the Render host so the Vite preview won't be blocked
    allowedHosts: ["fyers-goodbuck-algo.onrender.com"]
  }
})
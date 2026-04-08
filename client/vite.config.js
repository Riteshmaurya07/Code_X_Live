import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: VITE_BACKEND_URL,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
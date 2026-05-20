import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files at config time (Node context), where
  // process.env.VITE_* vars are NOT available without this call.
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:5000";

  return {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      monacoEditorPlugin.default ? monacoEditorPlugin.default({
        languageWorkers: ["editorWorkerService", "css", "html", "json", "typescript"],
      }) : monacoEditorPlugin({
        languageWorkers: ["editorWorkerService", "css", "html", "json", "typescript"],
      }),
    ],
    server: {
      port: 3000,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: backendUrl,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/zoho-api": {
        target: "https://analyticsapi.zoho.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zoho-api/, ""),
      },
      "/zoho-oauth": {
        target: "https://accounts.zoho.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zoho-oauth/, ""),
      },
    },
  },
  plugins: [
    react(),
    basicSsl(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

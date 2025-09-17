import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue({
      reactivityTransform: true,
    }),
  ],
  server: {
    historyApiFallback: true,
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: "[name].[hash].[ext]",
        chunkFileNames: "[name].[hash].js",
        entryFileNames: "[name].[hash].js",
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "./", // Ensure this is correct for your deployment environment
});

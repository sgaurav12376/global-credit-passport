import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://cp55q44hgb.execute-api.us-east-1.amazonaws.com",
        changeOrigin: true,
      },
    },
  },
});

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/org-chart-system/",
  plugins: [react()]
});

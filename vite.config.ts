import { defineConfig } from "vite";

// base "./" so the same build works on the web, inside Capacitor (iOS) and Electron (file://).
export default defineConfig({ base: "./", build: { outDir: "dist", target: "es2020" } });

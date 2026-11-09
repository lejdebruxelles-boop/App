/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";

// Content-Security-Policy injected into production builds (web, iOS WebView, Electron).
// Only the app's own files may run: no external scripts, no inline scripts, no eval, no plugins.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // inline style attributes (grid size, animation delays)
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const csp = (): Plugin => ({
  name: "inject-csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// base "./" so the same build works on the web, inside Capacitor (iOS) and Electron (file://).
export default defineConfig({ base: "./", plugins: [csp()], build: { outDir: "dist", target: "es2020" },
  // Only our own tests: native build folders (ios/App/build) contain third-party test files.
  test: { include: ["tests/**/*.test.ts"] },
});

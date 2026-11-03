import { createHash } from "node:crypto";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Content-Security-Policy for the built site (GitHub Pages can't send headers, so it goes in a
// <meta> tag). It lets the page run only its own scripts plus the small theme script inside
// index.html (allowed by its hash), and talk only to the API — so even if someone managed to slip
// a <script> into the page, the browser would refuse to run it or send the login token anywhere.
// Added at build time only: the dev server needs inline scripts and a websocket for hot reload.
function contentSecurityPolicy(apiUrl) {
  const apiOrigin = apiUrl.startsWith("http") ? new URL(apiUrl).origin : "";
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml(html) {
      const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
        .map((m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`);
      const policy = [
        "default-src 'self'",
        `script-src 'self' ${hashes.join(" ")}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:", // pictures from the API, YouTube thumbnails, images inside articles
        `connect-src 'self' ${apiOrigin}`,
        "frame-src https://www.youtube-nocookie.com https://www.youtube.com", // the About and product videos
        "media-src 'self' https:",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ");
      return html.replace("<head>", `<head>\n  <meta http-equiv="Content-Security-Policy" content="${policy}">`);
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: command === "build" ? "/My-portfolio-/" : "/",
    plugins: [react(), contentSecurityPolicy(env.VITE_API_URL || "")],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
  };
});

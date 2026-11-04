import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function devAbortHandler(): Plugin {
  return {
    name: "dev-abort-handler",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        req.on("error", (err: unknown) => {
          const msg = (err as Error)?.message || "";
          if (msg.includes("aborted") || (err as { code?: string })?.code === "ECONNRESET") {
            return;
          }
        });
        res.on("error", (err: unknown) => {
          const msg = (err as Error)?.message || "";
          if (
            msg.includes("aborted") ||
            (err as { code?: string })?.code === "ECONNRESET" ||
            (err as { code?: string })?.code === "EPIPE"
          ) {
            return;
          }
        });
        next();
      });
    },
  };
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    devAbortHandler(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});

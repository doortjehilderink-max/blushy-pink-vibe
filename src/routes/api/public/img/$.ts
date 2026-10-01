import { createFileRoute } from "@tanstack/react-router";

async function downloadOnce(path: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin.storage.from("post-images").download(path);
}

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        // A storage hiccup (cold start, brief network failure) must never bubble
        // up as a 500: try once more, then answer with a plain 404.
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const { data, error } = await downloadOnce(path);
            if (!error && data) {
              return new Response(data, {
                headers: {
                  "content-type": data.type || "image/jpeg",
                  "cache-control": "public, max-age=31536000, immutable",
                },
              });
            }
            if (error) {
              const status = Number((error as { statusCode?: number }).statusCode ?? 0);
              if (status === 400 || status === 404) {
                return new Response("Not found", { status: 404 });
              }
            }
          } catch {
            // fall through to the retry / final 404 below
          }
        }

        return new Response("Not found", {
          status: 404,
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});


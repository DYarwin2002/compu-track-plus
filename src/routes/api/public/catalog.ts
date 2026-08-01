import { createFileRoute } from "@tanstack/react-router";
import { json, preflight } from "@/backend/api/http";

export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async () => {
        const { fetchPublicCatalog } = await import("@/backend/services/catalog.server");
        try {
          return json({ data: await fetchPublicCatalog() });
        } catch {
          return json({ error: "catalog_unavailable" }, 500);
        }
      },
    },
  },
});

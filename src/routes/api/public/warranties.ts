import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, preflight } from "@/backend/api/http";

export const Route = createFileRoute("/api/public/warranties")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = z
          .string()
          .trim()
          .min(1)
          .max(64)
          .safeParse(url.searchParams.get("q") ?? url.searchParams.get("serie") ?? "");
        if (!parsed.success) return json({ error: "invalid_query" }, 400);
        const { findWarranties } = await import("@/backend/services/warranty.server");
        try {
          return json({ data: await findWarranties(parsed.data) });
        } catch {
          return json({ error: "lookup_failed" }, 500);
        }
      },
    },
  },
});

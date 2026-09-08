import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Sebas Urban" },
      { name: "description", content: "Acceso al sistema interno de Sebas Urban." },
      { property: "og:title", content: "Ingresar — Sebas Urban" },
      { property: "og:description", content: "Acceso al sistema interno de Sebas Urban." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

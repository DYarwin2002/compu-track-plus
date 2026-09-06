import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/portal-clientes";

export const Route = createFileRoute("/consultar")({
  head: () => ({
    meta: [
      { title: "Portal de clientes — Sebas Urban" },
      { name: "description", content: "Consulta el estado de tu pedido con tu DNI o número de boleta y descarga tu boleta en PDF." },
      { property: "og:title", content: "Portal de clientes — Sebas Urban" },
      { property: "og:description", content: "Sigue tu pedido y descarga tu boleta en segundos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://servicompuyarango.lovable.app/consultar" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://servicompuyarango.lovable.app/consultar" }],
  }),
  component: Page,
});

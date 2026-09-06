import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sebas Urban — Zapatillas y ropa urbana en Santa Cruz" },
      { name: "description", content: "Catálogo de zapatillas, hoodies, polos, casacas y gorras. Arma tu pedido por WhatsApp y sigue su estado desde el portal de clientes." },
      { property: "og:title", content: "Sebas Urban — Streetwear y zapatillas" },
      { property: "og:description", content: "Prendas originales, cambio de talla en 7 días y envíos a todo el país." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://servicompuyarango.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://servicompuyarango.lovable.app/" }],
  }),
  component: Page,
});

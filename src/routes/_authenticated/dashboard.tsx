import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Panel de trabajo — ServiCompu Yarango" },
      { name: "description", content: "Panel de trabajo diario: ventas, garantías por vencer y órdenes de servicio pendientes." },
      { property: "og:title", content: "Panel de trabajo — ServiCompu Yarango" },
      { property: "og:description", content: "Accesos rápidos y pendientes del día para la tienda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

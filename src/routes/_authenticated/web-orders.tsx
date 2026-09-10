import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/web-orders";

export const Route = createFileRoute("/_authenticated/web-orders")({
  head: () => ({
    meta: [
      { title: "Pedidos web — Sebas Urban" },
      { name: "description", content: "Pedidos recibidos desde el catálogo público de Sebas Urban." },
    ],
  }),
  component: Page,
});

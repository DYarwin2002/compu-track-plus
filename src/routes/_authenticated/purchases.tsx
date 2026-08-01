import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/purchases";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({
    meta: [
      { title: "Compras a proveedores — ServiCompu Yarango" },
      { name: "description", content: "Registro interno de compras y comprobantes de proveedores." },
    ],
  }),
  component: Page,
});

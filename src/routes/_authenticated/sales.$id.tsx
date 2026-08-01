import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/sale-detail";

export const Route = createFileRoute("/_authenticated/sales/$id")({
  head: () => ({ meta: [{ title: "Boleta — ServiCompu Yarango" }, { name: "description", content: "Detalle e impresión de boleta." }] }),
  component: Page,
});

import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/sale-new";

export const Route = createFileRoute("/_authenticated/sales/new")({
  head: () => ({ meta: [{ title: "Nueva venta — ServiCompu Yarango" }, { name: "description", content: "Registrar una nueva venta." }] }),
  component: Page,
});

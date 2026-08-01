import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/sales-list";

export const Route = createFileRoute("/_authenticated/sales/")({
  head: () => ({ meta: [{ title: "Ventas — CompuERP" }, { name: "description", content: "Historial de ventas." }] }),
  component: Page,
});

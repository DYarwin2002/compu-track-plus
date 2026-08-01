import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/customers";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Clientes — CompuERP" }, { name: "description", content: "Base de clientes." }] }),
  component: Page,
});

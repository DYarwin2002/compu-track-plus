import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/warranties";

export const Route = createFileRoute("/_authenticated/warranties")({
  head: () => ({ meta: [{ title: "Garantías — CompuERP" }, { name: "description", content: "Gestión de garantías." }] }),
  component: Page,
});

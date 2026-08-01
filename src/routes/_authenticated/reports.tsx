import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/reports";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reportes — ServiCompu Yarango" }, { name: "description", content: "Reportes de ventas y garantías." }] }),
  component: Page,
});

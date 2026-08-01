import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/admin/audit";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Auditoría — CompuERP" },
      { name: "description", content: "Registro de eventos y acciones del sistema." },
    ],
  }),
  component: Page,
});

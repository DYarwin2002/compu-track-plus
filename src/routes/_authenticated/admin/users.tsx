import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/admin/users";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuarios — ServiCompu Yarango" },
      { name: "description", content: "Administración de vendedores y administradores del ERP." },
    ],
  }),
  component: Page,
});

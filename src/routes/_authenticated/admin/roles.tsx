import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/admin/roles";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles y permisos — ServiCompu Yarango" },
      { name: "description", content: "Crea roles personalizados y define qué puede hacer cada uno." },
    ],
  }),
  component: Page,
});

import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — ServiCompu Yarango" },
      { name: "description", content: "Acceso al sistema interno de ServiCompu Yarango." },
      { property: "og:title", content: "Ingresar — ServiCompu Yarango" },
      { property: "og:description", content: "Acceso al sistema interno." },
    ],
  }),
  component: Page,
});

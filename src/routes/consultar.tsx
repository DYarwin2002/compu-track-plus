import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/portal-clientes";

export const Route = createFileRoute("/consultar")({
  head: () => ({
    meta: [
      { title: "Portal de clientes — ServiCompu Yarango" },
      { name: "description", content: "Consulta tu garantía por número de serie o boleta y descarga tu boleta con tu DNI." },
      { property: "og:title", content: "Portal de clientes — ServiCompu Yarango" },
      { property: "og:description", content: "Consulta garantías y descarga tu boleta en segundos." },
    ],
  }),
  component: Page,
});

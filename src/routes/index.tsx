import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiCompu Yarango — Venta y reparación de computadoras" },
      { name: "description", content: "Catálogo de laptops, PCs, componentes y accesorios con garantía. Servicio técnico especializado y portal de clientes para consultar garantías y boletas." },
      { property: "og:title", content: "ServiCompu Yarango — Tienda y servicio técnico" },
      { property: "og:description", content: "Equipos con garantía, precios claros y soporte técnico. Consulta tu garantía en línea." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

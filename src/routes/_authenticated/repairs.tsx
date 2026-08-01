import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/repairs";

export const Route = createFileRoute("/_authenticated/repairs")({
  head: () => ({
    meta: [
      { title: "Servicio técnico — CompuERP" },
      { name: "description", content: "Órdenes de trabajo para reparación de equipos: recepción, diagnóstico, presupuesto y entrega." },
    ],
  }),
  component: Page,
});

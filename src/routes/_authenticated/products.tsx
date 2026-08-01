import { createFileRoute } from "@tanstack/react-router";
import Page from "@/frontend/pages/app/products";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Productos — ServiCompu Yarango" }, { name: "description", content: "Inventario de productos." }] }),
  component: Page,
});

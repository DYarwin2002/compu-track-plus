export type Permission =
  | "sales.view"
  | "sales.create"
  | "sales.void"
  | "customers.view"
  | "customers.manage"
  | "products.view"
  | "products.manage"
  | "products.view_cost"
  | "reports.view"
  | "reports.export"
  | "dashboard.view_global";

export const PERMISSION_GROUPS: {
  label: string;
  items: { key: Permission; label: string; hint?: string }[];
}[] = [
  {
    label: "Ventas",
    items: [
      { key: "sales.view", label: "Ver ventas" },
      { key: "sales.create", label: "Crear ventas" },
      { key: "sales.void", label: "Anular ventas", hint: "Acción sensible" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { key: "customers.view", label: "Ver clientes" },
      { key: "customers.manage", label: "Crear / editar clientes" },
    ],
  },
  {
    label: "Productos e inventario",
    items: [
      { key: "products.view", label: "Ver productos" },
      { key: "products.manage", label: "Crear / editar productos y stock" },
      { key: "products.view_cost", label: "Ver costos de compra" },
    ],
  },
  {
    label: "Reportes y dashboard",
    items: [
      { key: "reports.view", label: "Ver reportes" },
      { key: "reports.export", label: "Exportar CSV / descargas" },
      { key: "dashboard.view_global", label: "Ver métricas globales del negocio" },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);
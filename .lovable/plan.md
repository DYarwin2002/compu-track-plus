
# ServiCompu Yarango — Fase 2

## 1. Rebrand + Dashboard moderno

**Marca**
- Renombrar toda la app a "ServiCompu Yarango" (sidebar, `<title>`, meta descriptions, login, landing, footer de boletas).
- Generar favicon simple con las iniciales "SY" y colocarlo en `public/favicon.png`. Eliminar `public/favicon.ico` del template.
- Ajustar `src/routes/__root.tsx` con la nueva marca.

**Dashboard** (`src/routes/_authenticated/dashboard.tsx`)
- KPI cards renovadas con iconos, gradiente sutil y variación vs. semana anterior.
- Gráfico de ventas de los últimos 14 días (área — `recharts`).
- Top 5 productos vendidos del mes (barras horizontales).
- Distribución de estados de garantías (donut).
- Órdenes de servicio por estado (barras).
- Lista lateral: últimas ventas y OTs recientes.
- Todo con tokens del design system (nada de colores hardcoded); admin ve global, vendedor ve solo lo suyo (respetando RLS actual).

## 2. Roles y permisos por acción

Mantener el enum `app_role` (admin, vendedor) para no romper lo existente, pero añadir permisos finos que el admin puede editar en la UI.

**Migración**
- Nueva tabla `role_permissions(role app_role, permission text, primary key(role, permission))`, con GRANT y RLS: admin gestiona, `authenticated` puede leer para pintar UI.
- Función `public.has_permission(_user_id uuid, _perm text) returns boolean` (SECURITY DEFINER, search_path=public) que consulta el rol del usuario y `role_permissions`. Admin siempre `true`.
- Seed inicial con permisos del catálogo (ver abajo) para el rol `vendedor`.

**Catálogo de permisos** (constante en `src/lib/permissions.ts`)
- `sales.view`, `sales.create`, `sales.void`
- `customers.view`, `customers.manage`
- `products.view`, `products.manage`, `products.view_cost`
- `warranties.view`, `warranties.manage`
- `repairs.view`, `repairs.manage`
- `reports.view`, `reports.export`
- `dashboard.view_global` (ver métricas globales, no solo propias)

**UI de administración**
- Nueva ruta `src/routes/_authenticated/admin/roles.tsx`: matriz rol × permisos con toggles; guardado por upserts en `role_permissions`.
- `useAuth`: exponer `permissions: string[]` y helper `can(perm)`; cargar en `loadContextFor`.
- Sidebar y botones críticos (crear/anular venta, exportar reportes, ver costos, etc.) usan `can(...)`.
- Menú Admin muestra el nuevo item "Roles y permisos".

## 3. Portal público de clientes

**Consulta ampliada** (`src/routes/consultar.tsx`)
- Tres pestañas: por N° de serie, por N° de boleta, por DNI.
- Muestra garantías (ya existe) y — si consulta por DNI o boleta — permite descargar la boleta PDF con un clic.
- Sin exponer PII: la consulta por DNI devuelve solo boletas propias (match exacto de documento), y muestra fecha + total + botón de descarga.

**Server function nueva** (`src/lib/public-sales.functions.ts`)
- `lookupSaleByNumber({ sale_number })` → resumen público (no expone otros datos del cliente).
- `lookupSalesByDocument({ document })` → lista mínima (id, sale_number, sale_date, total).
- `getPublicSalePdfData({ sale_id, verifier })` → devuelve datos completos para render PDF. `verifier` es el `document` del cliente o los últimos 4 dígitos del `sale_number` — sin match, error genérico.
- Todas con validación Zod, límites de resultados y sin autenticación.

**Generación de PDF**
- Instalar `jspdf` y `jspdf-autotable`.
- `src/lib/boleta-pdf.ts`: genera boleta A4 con logo/marca, datos de la venta, tabla de ítems, totales (subtotal, IGV, total), pie con leyenda de garantía. Reusable desde admin y portal público.
- Botón "Descargar PDF" en `src/routes/_authenticated/sales.$id.tsx` y en la consulta pública.

## 4. Seguridad

- Verificar RLS para `role_permissions` (solo admin escribe; lectura por `authenticated`).
- Server functions públicas: nunca devolver `customers.email/phone/address`.
- Ejecutar `supabase--linter` después de la migración; corregir warnings nuevos.

## Detalles técnicos

- Charts: `recharts` (ya suele venir en shadcn/tanstack template; si no, `bun add recharts`).
- Colores en gráficos → variables del theme (`--chart-1..5`).
- PDF: `bun add jspdf jspdf-autotable`.
- No tocar `src/integrations/supabase/*` autogenerados.
- Todo respeta el sistema oscuro/claro actual.

## Orden de ejecución

1. Migración (`role_permissions`, `has_permission`, seed).
2. `permissions.ts` + `useAuth` con `can()`.
3. Rebrand global + favicon.
4. Dashboard nuevo.
5. Página Admin → Roles.
6. PDF helper + botón en detalle de venta.
7. Portal público ampliado + server functions.
8. Lint de seguridad y ajustes finales.

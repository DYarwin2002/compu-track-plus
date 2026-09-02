import {Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/database/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Package, ShoppingCart, TrendingUp, CheckCircle2, Truck, Clock,
  ArrowUpRight, ArrowDownRight, Search, Users, PlusCircle, ArrowRight,
} from "lucide-react";
import { formatSoles, formatDate } from "@/frontend/lib/format";
import { useAuth } from "@/frontend/hooks/use-auth";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";



type Kpi = {
  monthSales: number;
  prevMonthSales: number;
  monthCount: number;
  todaySales: number;
  todayCount: number;
  stockUnits: number;
  lowStock: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
};

type SaleRow = { id: string; sale_number: string; sale_date: string; total: number; order_status?: string };

type SeriesPoint = { day: string; total: number };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function Dashboard() {
  const { can, role } = useAuth();
  const canGlobal = can("dashboard.view_global");
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [recentSales, setRecentSales] = useState<SaleRow[]>([]);
  const [openOrders, setOpenOrders] = useState<SaleRow[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const start14 = new Date(); start14.setDate(start14.getDate() - 13); start14.setHours(0, 0, 0, 0);

      const [
        monthQ, prevQ, todayQ, series14Q, statusQ,
        stockQ, recentSalesQ, openOrdersQ,
      ] = await Promise.all([
        supabase.from("sales").select("id, total").gte("sale_date", startMonth.toISOString()),
        supabase.from("sales").select("id, total")
          .gte("sale_date", startPrevMonth.toISOString())
          .lte("sale_date", endPrevMonth.toISOString()),
        supabase.from("sales").select("id, total").gte("sale_date", startToday.toISOString()),
        supabase.from("sales").select("sale_date, total").gte("sale_date", start14.toISOString()),
        supabase.from("sales").select("order_status"),
        supabase.from("products").select("id, stock"),
        supabase.from("sales").select("id, sale_number, sale_date, total, order_status")
          .order("sale_date", { ascending: false }).limit(5),
        supabase.from("sales").select("id, sale_number, sale_date, total, order_status")
          .neq("order_status", "Entregado").neq("order_status", "Cancelado")
          .order("sale_date", { ascending: false }).limit(6),
      ]);

      const sum = (rows: Array<{ total: number | string }> | null) =>
        (rows ?? []).reduce((s, r) => s + Number(r.total || 0), 0);

      const statusCount = (statusQ.data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.order_status] = (acc[r.order_status] ?? 0) + 1; return acc;
      }, {});

      setKpi({
        monthSales: sum(monthQ.data),
        prevMonthSales: sum(prevQ.data),
        monthCount: (monthQ.data ?? []).length,
        todaySales: sum(todayQ.data),
        todayCount: (todayQ.data ?? []).length,
        stockUnits: (stockQ.data ?? []).reduce((s, p) => s + (p.stock || 0), 0),
        lowStock: (stockQ.data ?? []).filter((p) => (p.stock ?? 0) <= 3).length,
        pendingOrders: (statusCount["Pendiente"] ?? 0) + (statusCount["En preparación"] ?? 0),
        shippedOrders: statusCount["Enviado"] ?? 0,
        deliveredOrders: statusCount["Entregado"] ?? 0,
      });

      const map = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(start14); d.setDate(start14.getDate() + i);
        map.set(d.toISOString().slice(0, 10), 0);
      }
      (series14Q.data ?? []).forEach((r) => {
        const k = new Date(r.sale_date).toISOString().slice(0, 10);
        map.set(k, (map.get(k) ?? 0) + Number(r.total || 0));
      });
      setSeries(Array.from(map.entries()).map(([day, total]) => ({
        day: day.slice(5), total: Math.round(total),
      })));

      setRecentSales((recentSalesQ.data ?? []) as SaleRow[]);
      setOpenOrders((openOrdersQ.data ?? []) as SaleRow[]);
    })();
  }, []);

  const monthDelta = useMemo(() => {
    if (!kpi) return null;
    if (kpi.prevMonthSales === 0) return kpi.monthSales > 0 ? 100 : 0;
    return ((kpi.monthSales - kpi.prevMonthSales) / kpi.prevMonthSales) * 100;
  }, [kpi]);

  const tasks = useMemo(() => {
    if (!kpi) return [];
    const list: { key: string; label: string; hint: string; to: string; tone: "warn" | "danger" | "ok"; Icon: typeof Package }[] = [];
    if (kpi.pendingOrders > 0)
      list.push({ key: "pend", label: `${kpi.pendingOrders} pedido(s) por preparar`, hint: "Alista y empaca los pedidos del día", to: "/sales", tone: "warn", Icon: Clock });
    if (kpi.shippedOrders > 0)
      list.push({ key: "ship", label: `${kpi.shippedOrders} pedido(s) en camino`, hint: "Confirma la entrega con el cliente", to: "/sales", tone: "ok", Icon: Truck });
    if (kpi.lowStock > 0)
      list.push({ key: "stock", label: `${kpi.lowStock} producto(s) con stock bajo`, hint: "Repón inventario antes de quedarte sin stock", to: "/products", tone: "warn", Icon: Package });
    return list;
  }, [kpi]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border p-5 sm:p-7"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {canGlobal ? "Vista global" : `Rol: ${role ?? "…"}`}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{greeting()} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hoy llevas <span className="font-bold text-foreground">{formatSoles(kpi?.todaySales ?? 0)}</span> en{" "}
              {kpi?.todayCount ?? 0} boleta(s).
            </p>
          </div>
          <Link
            to="/consultar" target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            <Search className="h-4 w-4" /> Portal de clientes
          </Link>
        </div>
      </section>

      {/* Acciones rápidas */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {can("sales.create") && (
            <QuickAction to="/sales/new" Icon={PlusCircle} title="Nueva venta" desc="Registrar boleta" primary />
          )}
          {can("customers.view") && (
            <QuickAction to="/customers" Icon={Users} title="Clientes" desc="Buscar o registrar" />
          )}
          {can("products.view") && (
            <QuickAction to="/products" Icon={Package} title="Catálogo" desc="Zapatillas y ropa" />
          )}
        </div>
      </section>

      {/* Pendientes */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Pendientes</h2>
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Todo al día. No hay alertas pendientes.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {tasks.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={`flex items-center gap-3 rounded-xl border p-4 transition hover:bg-muted/50 ${
                  t.tone === "danger" ? "border-destructive/40" : t.tone === "warn" ? "border-amber-500/40" : "border-emerald-500/40"
                }`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  t.tone === "danger" ? "bg-destructive/10 text-destructive"
                    : t.tone === "warn" ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                }`}>
                  <t.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Resumen */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Ventas del mes" value={formatSoles(kpi?.monthSales ?? 0)} sub={`${kpi?.monthCount ?? 0} boletas`} delta={monthDelta} Icon={TrendingUp} accent />
        <KpiCard label="Pedidos por preparar" value={String(kpi?.pendingOrders ?? 0)} sub="Pendientes y en preparación" Icon={Clock} warn={(kpi?.pendingOrders ?? 0) > 0} />
        <KpiCard label="Pedidos en camino" value={String(kpi?.shippedOrders ?? 0)} sub={`${kpi?.deliveredOrders ?? 0} entregados`} Icon={Truck} />
        <KpiCard label="Stock total" value={String(kpi?.stockUnits ?? 0)} sub={`${kpi?.lowStock ?? 0} bajo mínimo`} Icon={Package} warn={(kpi?.lowStock ?? 0) > 0} />
      </section>

      {/* Tendencia compacta */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Ventas · últimos 14 días</CardTitle>
        </CardHeader>
        <CardContent className="h-40 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)", border: "1px solid var(--color-border)",
                  borderRadius: 8, color: "var(--color-popover-foreground)", fontSize: 12,
                }}
                labelFormatter={(l) => `Día ${l}`}
                formatter={(v: number) => [formatSoles(v), "Ventas"]}
              />
              <Area type="monotone" dataKey="total" stroke="var(--color-primary)" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Actividad */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimas ventas</CardTitle>
            <Link to="/sales" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas recientes.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {recentSales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-mono text-xs">{s.sale_number}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(s.sale_date)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatSoles(Number(s.total))}</span>
                      <Link to="/sales/$id" params={{ id: s.id }} className="text-xs text-primary hover:underline">Ver</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pedidos en curso</CardTitle>
            <Link to="/sales" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </CardHeader>
          <CardContent>
            {openOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay pedidos pendientes.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {openOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{o.sale_number}</div>
                      <div className="truncate text-xs text-muted-foreground">{formatDate(o.sale_date)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{o.order_status}</Badge>
                      <Link to="/sales/$id" params={{ id: o.id }} className="text-xs text-primary hover:underline">Ver</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  to, Icon, title, desc, primary,
}: {
  to: string;
  Icon: typeof ShoppingCart;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col gap-2 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
        primary ? "border-primary/50 bg-primary/10" : "border-border bg-card"
      }`}
    >
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}

function KpiCard({
  label, value, sub, delta, Icon, accent, warn,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  Icon: typeof ShoppingCart;
  accent?: boolean;
  warn?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden">
      {accent && (
        <div aria-hidden className="absolute inset-0 opacity-10" style={{ background: "var(--gradient-primary)" }} />
      )}
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${warn ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-black sm:text-2xl">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {typeof delta === "number" && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-emerald-500" : "text-destructive"}`}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;

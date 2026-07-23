import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, ShieldCheck, ShieldAlert, ShieldX, ShoppingCart, TrendingUp,
  Wrench, ArrowUpRight, ArrowDownRight, Search,
} from "lucide-react";
import { formatSoles, formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ServiCompu Yarango" },
      { name: "description", content: "Panel de control con métricas de ventas, garantías y servicio técnico." },
    ],
  }),
  component: Dashboard,
});

type Kpi = {
  monthSales: number;
  prevMonthSales: number;
  monthCount: number;
  stockUnits: number;
  lowStock: number;
  activeWarranties: number;
  soonWarranties: number;
  expiredWarranties: number;
  openRepairs: number;
};

type SaleRow = { id: string; sale_number: string; sale_date: string; total: number };
type RepairRow = { id: string; order_number: string; device: string; status: string; created_at: string };
type SeriesPoint = { day: string; total: number };
type TopProduct = { name: string; qty: number };

function Dashboard() {
  const { can, role } = useAuth();
  const canGlobal = can("dashboard.view_global");
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [warrantyDist, setWarrantyDist] = useState<Array<{ name: string; value: number }>>([]);
  const [repairDist, setRepairDist] = useState<Array<{ name: string; value: number }>>([]);
  const [recentSales, setRecentSales] = useState<SaleRow[]>([]);
  const [recentRepairs, setRecentRepairs] = useState<RepairRow[]>([]);

  useEffect(() => {
    (async () => {
      await supabase.rpc("refresh_warranty_statuses");

      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const start14 = new Date(); start14.setDate(start14.getDate() - 13); start14.setHours(0, 0, 0, 0);
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);

      const [
        monthQ, prevQ, series14Q, itemsQ, warrCountsQ, repairCountsQ,
        stockQ, lowStockQ, recentSalesQ, recentRepairsQ,
      ] = await Promise.all([
        supabase.from("sales").select("id, total").gte("sale_date", startMonth.toISOString()),
        supabase.from("sales").select("id, total")
          .gte("sale_date", startPrevMonth.toISOString())
          .lte("sale_date", endPrevMonth.toISOString()),
        supabase.from("sales").select("sale_date, total").gte("sale_date", start14.toISOString()),
        supabase.from("sale_items").select("product_name, quantity, sales!inner(sale_date)")
          .gte("sales.sale_date", startMonth.toISOString()),
        supabase.from("warranties").select("status"),
        supabase.from("repairs").select("status"),
        supabase.from("products").select("stock"),
        supabase.from("products").select("id, stock"),
        supabase.from("sales").select("id, sale_number, sale_date, total")
          .order("sale_date", { ascending: false }).limit(6),
        supabase.from("repairs").select("id, order_number, device, status, created_at")
          .order("created_at", { ascending: false }).limit(6),
      ]);

      // KPI
      const monthSales = (monthQ.data ?? []).reduce((s, r) => s + Number(r.total || 0), 0);
      const prevMonthSales = (prevQ.data ?? []).reduce((s, r) => s + Number(r.total || 0), 0);
      const stockUnits = (stockQ.data ?? []).reduce((s, p) => s + (p.stock || 0), 0);
      const lowStock = (lowStockQ.data ?? []).filter((p) => (p.stock ?? 0) <= 3).length;
      const warrCount = (warrCountsQ.data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
      }, {});
      const repairCount = (repairCountsQ.data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
      }, {});
      const openRepairs = ["Recibido", "Diagnostico", "En reparacion", "Listo"]
        .reduce((s, k) => s + (repairCount[k] ?? 0), 0);

      setKpi({
        monthSales, prevMonthSales,
        monthCount: (monthQ.data ?? []).length,
        stockUnits, lowStock,
        activeWarranties: warrCount["Activa"] ?? 0,
        soonWarranties: warrCount["Próxima a vencer"] ?? 0,
        expiredWarranties: warrCount["Vencida"] ?? 0,
        openRepairs,
      });

      // 14-day series
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

      // Top products this month
      const agg = new Map<string, number>();
      (itemsQ.data ?? []).forEach((r: { product_name: string; quantity: number }) => {
        agg.set(r.product_name, (agg.get(r.product_name) ?? 0) + Number(r.quantity || 0));
      });
      setTop(Array.from(agg.entries())
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5));

      setWarrantyDist([
        { name: "Activa", value: warrCount["Activa"] ?? 0 },
        { name: "Próxima", value: warrCount["Próxima a vencer"] ?? 0 },
        { name: "Vencida", value: warrCount["Vencida"] ?? 0 },
      ].filter((d) => d.value > 0));

      setRepairDist(["Recibido", "Diagnostico", "En reparacion", "Listo", "Entregado", "Cancelado"]
        .map((s) => ({ name: s, value: repairCount[s] ?? 0 })));

      setRecentSales((recentSalesQ.data ?? []) as SaleRow[]);
      setRecentRepairs((recentRepairsQ.data ?? []) as RepairRow[]);

      void today; void in30;
    })();
  }, []);

  const monthDelta = useMemo(() => {
    if (!kpi) return null;
    if (kpi.prevMonthSales === 0) return kpi.monthSales > 0 ? 100 : 0;
    return ((kpi.monthSales - kpi.prevMonthSales) / kpi.prevMonthSales) * 100;
  }, [kpi]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Hola 👋</h1>
          <p className="text-sm text-muted-foreground">
            {canGlobal ? "Vista global de ServiCompu Yarango." : `Panel para tu rol (${role ?? "…"}).`}
          </p>
        </div>
        <Link
          to="/consultar" target="_blank"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Search className="h-4 w-4" /> Portal de clientes
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas del mes"
          value={formatSoles(kpi?.monthSales ?? 0)}
          sub={`${kpi?.monthCount ?? 0} boletas`}
          delta={monthDelta}
          Icon={TrendingUp}
          accent
        />
        <KpiCard
          label="Garantías activas"
          value={String(kpi?.activeWarranties ?? 0)}
          sub={`${kpi?.soonWarranties ?? 0} por vencer`}
          Icon={ShieldCheck}
        />
        <KpiCard
          label="Órdenes de servicio"
          value={String(kpi?.openRepairs ?? 0)}
          sub="En proceso"
          Icon={Wrench}
        />
        <KpiCard
          label="Stock total"
          value={String(kpi?.stockUnits ?? 0)}
          sub={`${kpi?.lowStock ?? 0} productos bajo mínimo`}
          Icon={Package}
          warn={(kpi?.lowStock ?? 0) > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Ventas · últimos 14 días</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)", border: "1px solid var(--color-border)",
                    borderRadius: 8, color: "var(--color-popover-foreground)", fontSize: 12,
                  }}
                  formatter={(v: number) => formatSoles(v)}
                />
                <Area type="monotone" dataKey="total" stroke="var(--color-primary)" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Estado de garantías</CardTitle></CardHeader>
          <CardContent className="h-72">
            {warrantyDist.length === 0 ? (
              <p className="pt-10 text-center text-sm text-muted-foreground">Sin datos aún</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={warrantyDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {warrantyDist.map((_, i) => (
                      <Cell key={i} fill={["var(--color-chart-1)","var(--color-chart-4)","var(--color-destructive)"][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{
                    background: "var(--color-popover)", border: "1px solid var(--color-border)",
                    borderRadius: 8, color: "var(--color-popover-foreground)", fontSize: 12,
                  }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top productos del mes</CardTitle></CardHeader>
          <CardContent className="h-64">
            {top.length === 0 ? (
              <p className="pt-10 text-center text-sm text-muted-foreground">Sin ventas aún este mes</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{
                    background: "var(--color-popover)", border: "1px solid var(--color-border)",
                    borderRadius: 8, color: "var(--color-popover-foreground)", fontSize: 12,
                  }} />
                  <Bar dataKey="qty" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Servicio técnico por estado</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairDist} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} interval={0} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{
                  background: "var(--color-popover)", border: "1px solid var(--color-border)",
                  borderRadius: 8, color: "var(--color-popover-foreground)", fontSize: 12,
                }} />
                <Bar dataKey="value" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
            <CardTitle className="text-base">Últimas órdenes de servicio</CardTitle>
            <Link to="/repairs" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </CardHeader>
          <CardContent>
            {recentRepairs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin órdenes recientes.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {recentRepairs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{r.order_number}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.device}</div>
                    </div>
                    <Badge variant="outline">{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {kpi && kpi.expiredWarranties > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <ShieldX className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-semibold">{kpi.expiredWarranties} garantía(s) vencidas</p>
                <p className="text-xs text-muted-foreground">Revisa el listado y contacta a los clientes.</p>
              </div>
            </div>
            <Link to="/warranties" className="text-sm font-medium text-primary hover:underline">Revisar →</Link>
          </CardContent>
        </Card>
      )}
    </div>
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
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{ background: "var(--gradient-primary)" }}
        />
      )}
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${warn ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
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
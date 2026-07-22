import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Package, ShieldCheck, ShieldAlert, ShieldX, ShoppingCart, TrendingUp, Monitor } from "lucide-react";
import { formatSoles, formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CompuERP" }, { name: "description", content: "Panel principal del ERP." }] }),
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({ computersSold: 0, active: 0, soon: 0, expired: 0, monthSales: 0, stock: 0 });
  const [soonList, setSoonList] = useState<Array<{ id: string; product_name: string; serial_number: string | null; expires_at: string }>>([]);

  useEffect(() => {
    (async () => {
      await supabase.rpc("refresh_warranty_statuses");
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      const today = new Date().toISOString().slice(0, 10);

      const [{ count: sold }, { count: active }, { count: soon }, { count: expired }, monthSales, { data: products }, { data: soonRows }] = await Promise.all([
        supabase.from("sale_items").select("id", { count: "exact", head: true }).in("product_id",
          (await supabase.from("products").select("id").in("category", ["Laptop", "PC"])).data?.map((p) => p.id) ?? []),
        supabase.from("warranties").select("id", { count: "exact", head: true }).eq("status", "Activa"),
        supabase.from("warranties").select("id", { count: "exact", head: true }).eq("status", "Próxima a vencer"),
        supabase.from("warranties").select("id", { count: "exact", head: true }).eq("status", "Vencida"),
        supabase.from("sales").select("total").gte("sale_date", startMonth.toISOString()),
        supabase.from("products").select("stock"),
        supabase.from("warranties").select("id, product_name, serial_number, expires_at").gte("expires_at", today).lte("expires_at", in30.toISOString().slice(0, 10)).order("expires_at").limit(6),
      ]);

      const monthTotal = (monthSales.data ?? []).reduce((s, r) => s + Number(r.total || 0), 0);
      const totalStock = (products ?? []).reduce((s, p) => s + (p.stock || 0), 0);
      setStats({ computersSold: sold ?? 0, active: active ?? 0, soon: soon ?? 0, expired: expired ?? 0, monthSales: monthTotal, stock: totalStock });
      setSoonList(soonRows ?? []);
    })();
  }, []);

  const kpis = [
    { title: "Computadoras vendidas", value: stats.computersSold, icon: Monitor, color: "text-primary" },
    { title: "Garantías activas", value: stats.active, icon: ShieldCheck, color: "text-green-500" },
    { title: "Próximas a vencer (30d)", value: stats.soon, icon: ShieldAlert, color: "text-orange-500" },
    { title: "Garantías vencidas", value: stats.expired, icon: ShieldX, color: "text-destructive" },
    { title: "Ventas del mes", value: formatSoles(stats.monthSales), icon: TrendingUp, color: "text-primary" },
    { title: "Productos en stock", value: stats.stock, icon: Package, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Panel principal</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo de tu tienda.</p>
      </div>

      {stats.soon > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atención</AlertTitle>
          <AlertDescription>Tienes <b>{stats.soon}</b> garantía(s) próximas a vencer en los próximos 30 días.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.title}</CardTitle>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </CardHeader>
            <CardContent><p className="text-3xl font-black">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Garantías por vencer pronto</CardTitle><p className="text-xs text-muted-foreground">Próximos 30 días</p></div>
          <Link to="/warranties" className="text-sm text-primary hover:underline">Ver todas →</Link>
        </CardHeader>
        <CardContent>
          {soonList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay garantías por vencer en los próximos 30 días.</p>
          ) : (
            <ul className="divide-y divide-border">
              {soonList.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{w.product_name}</p>
                    <p className="text-xs text-muted-foreground">Serie: {w.serial_number ?? "—"}</p>
                  </div>
                  <Badge variant="secondary">Vence {formatDate(w.expires_at)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-primary/30 bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Consulta rápida de garantía</h2>
            <p className="text-sm text-muted-foreground">Verifica una garantía escribiendo solo el número de serie.</p>
          </div>
          <Link to="/consultar" target="_blank" className="rounded-lg px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg" style={{ background: "var(--gradient-primary)" }}>
            Abrir consulta
          </Link>
        </div>
      </div>
    </div>
  );
}

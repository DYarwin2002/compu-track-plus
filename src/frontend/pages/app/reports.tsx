import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Download, TrendingUp, Package, Truck, PackageCheck } from "lucide-react";
import { formatSoles, formatDate } from "@/frontend/lib/format";
import { useAuth } from "@/frontend/hooks/use-auth";



type DailySale = { day: string; total: number; count: number };
type TopProduct = { product_name: string; qty: number; revenue: number };
type BrandRow = { brand: string; qty: number };

function Reports() {
  const { can } = useAuth();
  const canExport = can("reports.export");
  const [daily, setDaily] = useState<DailySale[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, count: 0, active: 0, expired: 0 });

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data: sales } = await supabase.from("sales").select("sale_date, total").gte("sale_date", since.toISOString()).order("sale_date");
      const map = new Map<string, { total: number; count: number }>();
      (sales ?? []).forEach((s) => {
        const k = new Date(s.sale_date).toISOString().slice(0, 10);
        const cur = map.get(k) ?? { total: 0, count: 0 };
        cur.total += Number(s.total); cur.count += 1; map.set(k, cur);
      });
      setDaily([...map.entries()].map(([day, v]) => ({ day, ...v })));

      const { data: items } = await supabase.from("sale_items").select("product_name, quantity, line_total, products(brand)").limit(2000);
      const topMap = new Map<string, TopProduct>();
      const brandMap = new Map<string, number>();
      (items ?? []).forEach((i: { product_name: string; quantity: number; line_total: number; products: { brand: string | null } | null }) => {
        const t = topMap.get(i.product_name) ?? { product_name: i.product_name, qty: 0, revenue: 0 };
        t.qty += i.quantity; t.revenue += Number(i.line_total); topMap.set(i.product_name, t);
        const b = i.products?.brand ?? "Sin marca";
        brandMap.set(b, (brandMap.get(b) ?? 0) + i.quantity);
      });
      setTop([...topMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10));
      setBrands([...brandMap.entries()].map(([brand, qty]) => ({ brand, qty })).sort((a, b) => b.qty - a.qty));

      const [{ count: cAll }, { data: rev }, { count: cAct }, { count: cExp }] = await Promise.all([
        supabase.from("sales").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("total"),
        supabase.from("sales").select("id", { count: "exact", head: true }).neq("order_status", "Entregado").neq("order_status", "Cancelado"),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("order_status", "Entregado"),
      ]);
      const revenue = (rev ?? []).reduce((s, r) => s + Number(r.total), 0);
      setTotals({ revenue, count: cAll ?? 0, active: cAct ?? 0, expired: cExp ?? 0 });
    })();
  }, []);

  const exportCSV = (name: string, headers: string[], rows: (string | number)[][]) => {
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-black">Reportes</h1><p className="text-sm text-muted-foreground">Análisis de ventas, productos y pedidos.</p></div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={TrendingUp} title="Ingresos totales" value={formatSoles(totals.revenue)} />
        <KpiCard icon={Package} title="Ventas totales" value={totals.count} />
        <KpiCard icon={Truck} title="Pedidos en curso" value={totals.active} />
        <KpiCard icon={PackageCheck} title="Pedidos entregados" value={totals.expired} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ventas de los últimos 30 días</CardTitle>
            {canExport && <Button size="sm" variant="outline" onClick={() => exportCSV("ventas-diarias", ["Fecha", "Ventas", "Total"], daily.map((d) => [d.day, d.count, d.total.toFixed(2)]))}><Download className="mr-2 h-3 w-3" /> CSV</Button>}
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
            <div className="space-y-2">
              {daily.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground">{formatDate(d.day)}</span>
                  <div className="flex-1"><div className="h-6 rounded" style={{ width: `${(d.total / Math.max(...daily.map((x) => x.total))) * 100}%`, background: "var(--gradient-primary)" }} /></div>
                  <span className="w-24 text-right text-sm font-medium">{formatSoles(d.total)}</span>
                  <span className="w-12 text-right text-xs text-muted-foreground">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos más vendidos</CardTitle>
            {canExport && <Button size="sm" variant="outline" onClick={() => exportCSV("top-productos", ["Producto", "Cantidad", "Ingresos"], top.map((t) => [t.product_name, t.qty, t.revenue.toFixed(2)]))}><Download className="mr-2 h-3 w-3" /> CSV</Button>}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {top.map((t) => (
                <li key={t.product_name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.product_name}</span>
                  <span className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{t.qty} u.</span><span className="font-medium">{formatSoles(t.revenue)}</span></span>
                </li>
              ))}
              {top.length === 0 && <p className="text-sm text-muted-foreground">Sin datos.</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Equipos vendidos por marca</CardTitle>
            {canExport && <Button size="sm" variant="outline" onClick={() => exportCSV("por-marca", ["Marca", "Cantidad"], brands.map((b) => [b.brand, b.qty]))}><Download className="mr-2 h-3 w-3" /> CSV</Button>}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brands.map((b) => (
                <li key={b.brand} className="flex items-center justify-between text-sm">
                  <span>{b.brand}</span>
                  <span className="font-medium">{b.qty} u.</span>
                </li>
              ))}
              {brands.length === 0 && <p className="text-sm text-muted-foreground">Sin datos.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value }: { icon: React.ComponentType<{ className?: string }>; title: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent><p className="text-2xl font-black">{value}</p></CardContent>
    </Card>
  );
}

export default Reports;

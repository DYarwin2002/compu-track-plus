import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Monitor, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { computeWarrantyStatus, daysUntil, formatDate } from "@/lib/format";

export const Route = createFileRoute("/consultar")({
  head: () => ({
    meta: [
      { title: "Consultar garantía — CompuERP" },
      { name: "description", content: "Verifica el estado de tu garantía con el número de serie o de boleta." },
      { property: "og:title", content: "Consultar garantía" },
      { property: "og:description", content: "Verifica tu garantía en segundos." },
    ],
  }),
  component: Consultar,
});

type Row = {
  id: string;
  product_name: string;
  serial_number: string | null;
  sale_date: string;
  expires_at: string;
  status: string;
  duration_months: number;
  customers?: { full_name: string } | null;
  sales?: { sale_number: string } | null;
};

function Consultar() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setRows(null);
    const term = q.trim();
    if (!term) { setBusy(false); return; }
    // Search by serial or by sale number
    const { data: bySerial } = await supabase
      .from("warranties")
      .select("id, product_name, serial_number, sale_date, expires_at, status, duration_months, customers(full_name), sales(sale_number)")
      .ilike("serial_number", `%${term}%`);
    let data = bySerial ?? [];
    if (data.length === 0) {
      const { data: sale } = await supabase.from("sales").select("id").eq("sale_number", term.toUpperCase()).maybeSingle();
      if (sale) {
        const { data: w } = await supabase
          .from("warranties")
          .select("id, product_name, serial_number, sale_date, expires_at, status, duration_months, customers(full_name), sales(sale_number)")
          .eq("sale_id", sale.id);
        data = w ?? [];
      }
    }
    setBusy(false);
    if (data.length === 0) setErr("No encontramos garantías para tu búsqueda.");
    setRows(data as Row[]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Monitor className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">CompuERP</span>
          </Link>
          <Button asChild variant="ghost"><Link to="/auth">Ingresar</Link></Button>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-black">Consultar garantía</h1>
        <p className="mt-2 text-muted-foreground">Ingresa el número de serie del equipo o el número de boleta.</p>
        <form onSubmit={search} className="mt-6 flex gap-2">
          <Input placeholder="Ej. SN123456 o B000123" value={q} onChange={(e) => setQ(e.target.value)} className="text-lg" />
          <Button type="submit" disabled={busy} size="lg"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
        </form>
        {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
        <div className="mt-6 space-y-4">
          {rows?.map((r) => {
            const days = daysUntil(r.expires_at);
            const status = r.status === "Anulada" ? "Anulada" : computeWarrantyStatus(r.expires_at);
            const color = status === "Activa" ? "default" : status === "Próxima a vencer" ? "secondary" : "destructive";
            const Icon = status === "Activa" ? ShieldCheck : status === "Próxima a vencer" ? ShieldAlert : ShieldX;
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{r.product_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Serie: {r.serial_number ?? "—"} · Boleta {r.sales?.sale_number ?? "—"}</p>
                  </div>
                  <Badge variant={color as "default" | "secondary" | "destructive"}><Icon className="mr-1 h-3.5 w-3.5" />{status}</Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{r.customers?.full_name ?? "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Compra</p><p className="font-medium">{formatDate(r.sale_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vence</p><p className="font-medium">{formatDate(r.expires_at)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Días restantes</p><p className={`font-bold ${days < 0 ? "text-destructive" : days <= 30 ? "text-orange-500" : "text-green-500"}`}>{days < 0 ? `Vencida hace ${Math.abs(days)}d` : `${days} días`}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
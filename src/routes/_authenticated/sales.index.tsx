import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Printer } from "lucide-react";
import { formatSoles, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/sales/")({
  head: () => ({ meta: [{ title: "Ventas — CompuERP" }, { name: "description", content: "Historial de ventas." }] }),
  component: SalesList,
});

type S = { id: string; sale_number: string; sale_date: string; total: number; payment_method: string; customers: { full_name: string } | null };

function SalesList() {
  const [rows, setRows] = useState<S[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      let query = supabase.from("sales").select("id, sale_number, sale_date, total, payment_method, customers(full_name)").order("sale_date", { ascending: false }).limit(200);
      if (q) query = query.ilike("sale_number", `%${q.toUpperCase()}%`);
      const { data } = await query;
      setRows((data ?? []) as never);
    })();
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-black">Ventas</h1><p className="text-sm text-muted-foreground">Historial y reimpresión de boletas.</p></div>
        <Button asChild><Link to="/sales/new"><Plus className="mr-2 h-4 w-4" /> Nueva venta</Link></Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por número de boleta" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Boleta</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Pago</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono font-bold">{s.sale_number}</TableCell>
                <TableCell>{formatDateTime(s.sale_date)}</TableCell>
                <TableCell>{s.customers?.full_name ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{s.payment_method}</Badge></TableCell>
                <TableCell className="text-right font-bold">{formatSoles(s.total)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost"><Link to="/sales/$id" params={{ id: s.id }}><Printer className="mr-1 h-3 w-3" /> Ver / Imprimir</Link></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin ventas</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import {Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Input } from "@/frontend/components/ui/input";
import { Plus, Search, Printer, Trash2 } from "lucide-react";
import { formatSoles, formatDateTime } from "@/frontend/lib/format";
import { Badge } from "@/frontend/components/ui/badge";
import { useAuth } from "@/frontend/hooks/use-auth";
import { toast } from "sonner";
import { useConfirm } from "@/frontend/components/confirm-dialog";



type S = { id: string; sale_number: string; sale_date: string; total: number; payment_method: string; customers: { full_name: string } | null };

function SalesList() {
  const { isAdmin } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [rows, setRows] = useState<S[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    let query = supabase.from("sales").select("id, sale_number, sale_date, total, payment_method, customers(full_name)").order("sale_date", { ascending: false }).limit(200);
    if (q) query = query.ilike("sale_number", `%${q.toUpperCase()}%`);
    const { data } = await query;
    setRows((data ?? []) as never);
  };
  useEffect(() => { load(); }, [q]);

  const removeSale = async (s: S) => {
    if (!(await confirm({
      title: `¿Eliminar la venta ${s.sale_number}?`,
      description: "Se borrarán sus productos y garantías asociadas.",
      confirmText: "Eliminar venta",
      destructive: true,
    }))) return;
    const { error } = await supabase.from("sales").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Venta eliminada");
    load();
  };

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
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeSale(s)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin ventas</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {confirmDialog}
    </div>
  );
}

export default SalesList;

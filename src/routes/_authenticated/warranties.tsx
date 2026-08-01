import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { Badge } from "@/frontend/components/ui/badge";
import { toast } from "sonner";
import { formatDate, daysUntil } from "@/frontend/lib/format";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/warranties")({
  head: () => ({ meta: [{ title: "Garantías — CompuERP" }, { name: "description", content: "Gestión de garantías." }] }),
  component: Warranties,
});

type W = { id: string; product_name: string; serial_number: string | null; sale_date: string; expires_at: string; status: string; duration_months: number; customers: { full_name: string } | null; sales: { sale_number: string } | null };

function Warranties() {
  const [rows, setRows] = useState<W[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const load = async () => {
    await supabase.rpc("refresh_warranty_statuses");
    let query = supabase.from("warranties").select("id, product_name, serial_number, sale_date, expires_at, status, duration_months, customers(full_name), sales(sale_number)").order("expires_at").limit(500);
    if (status !== "all") query = query.eq("status", status as never);
    if (q) query = query.or(`serial_number.ilike.%${q}%,product_name.ilike.%${q}%`);
    const { data } = await query;
    setRows((data ?? []) as never);
  };
  useEffect(() => { load(); }, [q, status]);

  const setStatusFor = async (id: string, s: string) => {
    const { error } = await supabase.from("warranties").update({ status: s as never }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actualizado"); load();
  };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black">Garantías</h1><p className="text-sm text-muted-foreground">Todas las garantías generadas por ventas.</p></div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por serie o producto" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Activa">Activa</SelectItem>
            <SelectItem value="Próxima a vencer">Próxima a vencer</SelectItem>
            <SelectItem value="Vencida">Vencida</SelectItem>
            <SelectItem value="Anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Serie</TableHead><TableHead>Cliente</TableHead><TableHead>Boleta</TableHead><TableHead>Vence</TableHead><TableHead>Días</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((w) => {
              const d = daysUntil(w.expires_at);
              const badge = w.status === "Activa" ? "default" : w.status === "Próxima a vencer" ? "secondary" : w.status === "Vencida" ? "destructive" : "outline";
              return (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.product_name}</TableCell>
                  <TableCell className="font-mono text-xs">{w.serial_number ?? "—"}</TableCell>
                  <TableCell>{w.customers?.full_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{w.sales?.sale_number ?? "—"}</TableCell>
                  <TableCell>{formatDate(w.expires_at)}</TableCell>
                  <TableCell className={d < 0 ? "text-destructive" : d <= 30 ? "text-orange-500" : ""}>{d < 0 ? `-${Math.abs(d)}` : d} d</TableCell>
                  <TableCell><Badge variant={badge as "default" | "secondary" | "destructive" | "outline"}>{w.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {w.status !== "Anulada" ? <Button size="sm" variant="ghost" onClick={() => setStatusFor(w.id, "Anulada")}>Anular</Button>
                      : <Button size="sm" variant="ghost" onClick={() => setStatusFor(w.id, "Activa")}>Reactivar</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin garantías</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

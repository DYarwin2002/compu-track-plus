import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { ShoppingBag, Phone, MapPin, Trash2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatSoles } from "@/frontend/lib/format";
import { useAuth } from "@/frontend/hooks/use-auth";
import { useConfirm } from "@/frontend/components/confirm-dialog";

const STATUSES = ["Pendiente", "Confirmado", "En preparación", "Enviado", "Entregado", "Cancelado"] as const;

type Item = {
  id: string;
  product_name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Order = {
  id: string;
  order_number: string;
  track_code: string;
  customer_name: string;
  customer_document: string;
  customer_phone: string;
  customer_address: string | null;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
  web_order_items: Item[];
};

function statusTone(status: string) {
  if (status === "Cancelado") return "bg-destructive text-destructive-foreground";
  if (status === "Entregado") return "bg-emerald-500 text-white";
  if (status === "Enviado") return "bg-primary text-primary-foreground";
  if (status === "Pendiente") return "bg-muted text-foreground";
  return "bg-amber-500 text-white";
}

function WebOrders() {
  const { isAdmin } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("web_orders")
      .select(
        "id, order_number, track_code, customer_name, customer_document, customer_phone, customer_address, notes, total, status, created_at, web_order_items(id, product_name, size, color, quantity, unit_price, line_total)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as Order[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("web_orders").update({ status }).eq("id", id);
    if (error) return toast.error("No se pudo actualizar el estado.");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Estado actualizado");
  };

  const remove = async (o: Order) => {
    const ok = await confirm({
      title: "Eliminar pedido",
      description: `¿Eliminar el pedido ${o.order_number} de ${o.customer_name}?`,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    const { error } = await supabase.from("web_orders").delete().eq("id", o.id);
    if (error) return toast.error("No se pudo eliminar el pedido.");
    setRows((prev) => prev.filter((r) => r.id !== o.id));
    toast.success("Pedido eliminado");
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <ShoppingBag className="h-6 w-6 text-primary" /> Pedidos web
          </h1>
          <p className="text-sm text-muted-foreground">Pedidos hechos por clientes desde el catálogo público.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="mr-2 h-4 w-4" /> Actualizar</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay pedidos desde el catálogo.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <div className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${statusTone(o.status)}`}>{o.status}</div>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-lg">{o.order_number}</CardTitle>
                  <p className="text-xs text-muted-foreground">{formatDate(o.created_at)} · Código {o.track_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-black">{formatSoles(o.total)}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-bold">{o.customer_name} <span className="font-normal text-muted-foreground">· DNI {o.customer_document}</span></p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5 text-primary" /> {o.customer_phone}</p>
                  {o.customer_address && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" /> {o.customer_address}</p>
                  )}
                  {o.notes && <p className="mt-2 text-xs italic text-muted-foreground">“{o.notes}”</p>}
                </div>

                <ul className="space-y-1 text-sm">
                  {o.web_order_items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 border-b border-border/60 py-1 last:border-0">
                      <span className="min-w-0 truncate">
                        {i.quantity}× {i.product_name}
                        {(i.size || i.color) && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {[i.size ? `Talla ${i.size}` : null, i.color].filter(Boolean).join(" · ")}
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 font-semibold">{formatSoles(i.line_total)}</span>
                    </li>
                  ))}
                </ul>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => remove(o)} aria-label="Eliminar pedido">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default WebOrders;

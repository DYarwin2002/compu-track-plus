import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/frontend/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/frontend/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/frontend/components/ui/table";
import { Plus, Pencil, Wrench, Search } from "lucide-react";
import { toast } from "sonner";
import { formatSoles, formatDate } from "@/frontend/lib/format";

export const Route = createFileRoute("/_authenticated/repairs")({
  head: () => ({
    meta: [
      { title: "Servicio técnico — CompuERP" },
      { name: "description", content: "Órdenes de trabajo para reparación de equipos: recepción, diagnóstico, presupuesto y entrega." },
    ],
  }),
  component: RepairsPage,
});

const STATUSES = ["Recibido", "Diagnostico", "En reparacion", "Listo", "Entregado", "Cancelado"] as const;
type Status = (typeof STATUSES)[number];

type Customer = { id: string; full_name: string; document: string };
type Repair = {
  id: string;
  order_number: string;
  customer_id: string | null;
  device: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  accessories: string | null;
  reported_issue: string;
  diagnosis: string | null;
  internal_notes: string | null;
  technician: string | null;
  cost_estimate: number;
  cost_final: number;
  status: Status;
  received_at: string;
  delivered_at: string | null;
  created_at: string;
  customers?: Customer | null;
};

const emptyForm = {
  customer_id: "" as string,
  device: "",
  brand: "",
  model: "",
  serial_number: "",
  accessories: "",
  reported_issue: "",
  diagnosis: "",
  internal_notes: "",
  technician: "",
  cost_estimate: 0,
  cost_final: 0,
  status: "Recibido" as Status,
};

function statusVariant(s: Status): "default" | "secondary" | "destructive" | "outline" {
  if (s === "Entregado") return "default";
  if (s === "Cancelado") return "destructive";
  if (s === "Listo") return "secondary";
  return "outline";
}

function RepairsPage() {
  const [rows, setRows] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todas" | Status>("todas");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Repair | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repairs")
      .select("*, customers(id, full_name, document)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Repair[]);
    setLoading(false);
  };

  const loadCustomers = async () => {
    const { data } = await supabase.from("customers").select("id, full_name, document").order("full_name");
    setCustomers((data ?? []) as Customer[]);
  };

  useEffect(() => { load(); loadCustomers(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "todas" && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.order_number.toLowerCase().includes(term) ||
        r.device.toLowerCase().includes(term) ||
        (r.brand ?? "").toLowerCase().includes(term) ||
        (r.model ?? "").toLowerCase().includes(term) ||
        (r.serial_number ?? "").toLowerCase().includes(term) ||
        (r.customers?.full_name ?? "").toLowerCase().includes(term) ||
        (r.customers?.document ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length };
    STATUSES.forEach((s) => (c[s] = 0));
    rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (r: Repair) => {
    setEditing(r);
    setForm({
      customer_id: r.customer_id ?? "",
      device: r.device,
      brand: r.brand ?? "",
      model: r.model ?? "",
      serial_number: r.serial_number ?? "",
      accessories: r.accessories ?? "",
      reported_issue: r.reported_issue,
      diagnosis: r.diagnosis ?? "",
      internal_notes: r.internal_notes ?? "",
      technician: r.technician ?? "",
      cost_estimate: Number(r.cost_estimate ?? 0),
      cost_final: Number(r.cost_final ?? 0),
      status: r.status,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.device.trim() || !form.reported_issue.trim()) {
      toast.error("Equipo y falla reportada son obligatorios");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        customer_id: form.customer_id || null,
        device: form.device.trim(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        accessories: form.accessories.trim() || null,
        reported_issue: form.reported_issue.trim(),
        diagnosis: form.diagnosis.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        technician: form.technician.trim() || null,
        cost_estimate: Number(form.cost_estimate) || 0,
        cost_final: Number(form.cost_final) || 0,
        status: form.status,
        delivered_at: form.status === "Entregado" ? new Date().toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from("repairs").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Orden actualizada");
      } else {
        const { error } = await supabase.from("repairs").insert(payload as never);
        if (error) throw error;
        toast.success("Orden creada");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const quickStatus = async (r: Repair, s: Status) => {
    const patch = {
      status: s,
      delivered_at: s === "Entregado" && !r.delivered_at ? new Date().toISOString() : r.delivered_at,
    };
    const { error } = await supabase.from("repairs").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Estado: ${s}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Wrench className="h-6 w-6" /> Servicio técnico
          </h1>
          <p className="text-sm text-muted-foreground">
            Órdenes de trabajo: recepción, diagnóstico, reparación y entrega.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Nueva orden
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total" value={counts.total} />
        {STATUSES.map((s) => (
          <StatCard key={s} label={s} value={counts[s] ?? 0} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Órdenes</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar N°, equipo, serie, cliente…"
                  className="w-64 pl-8"
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los estados</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Recibido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin órdenes</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.order_number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(r.received_at)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{r.customers?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.customers?.document ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.device}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.brand, r.model].filter(Boolean).join(" ")}
                      {r.serial_number ? ` · S/N ${r.serial_number}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.technician ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatSoles(Number(r.cost_final || r.cost_estimate))}
                  </TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => quickStatus(r, v as Status)}>
                      <SelectTrigger className="h-8 w-36">
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.order_number}` : "Nueva orden de trabajo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Cliente</Label>
                <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} · {c.document}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equipo *</Label>
                <Input value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} placeholder="Laptop, PC, Impresora…" required />
              </div>
              <div>
                <Label>Técnico asignado</Label>
                <Input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} />
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <Label>N° de serie</Label>
                <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
              </div>
              <div>
                <Label>Accesorios entregados</Label>
                <Input value={form.accessories} onChange={(e) => setForm({ ...form, accessories: e.target.value })} placeholder="Cargador, mouse, funda…" />
              </div>
              <div className="sm:col-span-2">
                <Label>Falla reportada *</Label>
                <Textarea rows={2} value={form.reported_issue} onChange={(e) => setForm({ ...form, reported_issue: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Diagnóstico</Label>
                <Textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notas internas</Label>
                <Textarea rows={2} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
              </div>
              <div>
                <Label>Costo estimado (S/)</Label>
                <Input type="number" min="0" step="0.01" value={form.cost_estimate} onChange={(e) => setForm({ ...form, cost_estimate: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Costo final (S/)</Label>
                <Input type="number" min="0" step="0.01" value={form.cost_final} onChange={(e) => setForm({ ...form, cost_final: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear orden"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xl font-black">{value}</div>
      </CardContent>
    </Card>
  );
}
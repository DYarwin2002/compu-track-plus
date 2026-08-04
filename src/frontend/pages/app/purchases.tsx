import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Badge } from "@/frontend/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/frontend/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Plus, Pencil, Trash2, Search, FileImage, Truck } from "lucide-react";
import { toast } from "sonner";
import { formatSoles, formatDate, IGV_RATE } from "@/frontend/lib/format";
import { MediaUpload } from "@/frontend/components/media-upload";
import { signedMediaUrl } from "@/frontend/lib/media";
import { useConfirm } from "@/frontend/components/confirm-dialog";



type P = {
  id: string;
  supplier_name: string;
  supplier_ruc: string | null;
  doc_type: string;
  doc_number: string;
  purchase_date: string;
  subtotal: number;
  igv: number;
  total: number;
  payment_method: string;
  notes: string | null;
  image_url: string | null;
};

const DOC_TYPES = ["Boleta", "Factura", "Nota de venta", "Guía", "Otro"];
const PAY = ["Efectivo", "Yape", "Transferencia", "Tarjeta", "Crédito"];

const empty: Partial<P> = {
  supplier_name: "", supplier_ruc: "", doc_type: "Boleta", doc_number: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  subtotal: 0, igv: 0, total: 0, payment_method: "Efectivo", notes: "", image_url: null,
};

function Purchases() {
  const { confirm, confirmDialog } = useConfirm();
  const [rows, setRows] = useState<P[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<P>>(empty);
  const [viewer, setViewer] = useState<{ open: boolean; url: string | null; title: string }>({ open: false, url: null, title: "" });

  const load = async () => {
    let query = supabase.from("purchases").select("*").order("purchase_date", { ascending: false }).limit(300);
    if (q) query = query.or(`supplier_name.ilike.%${q}%,doc_number.ilike.%${q}%,supplier_ruc.ilike.%${q}%`);
    const { data } = await query;
    setRows((data ?? []) as P[]);
  };
  useEffect(() => { load(); }, [q]);

  const totals = useMemo(() => {
    const total = rows.reduce((a, r) => a + Number(r.total || 0), 0);
    const month = rows
      .filter((r) => r.purchase_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((a, r) => a + Number(r.total || 0), 0);
    return { total, month, count: rows.length };
  }, [rows]);

  const setTotal = (value: number) => {
    const total = Number(value) || 0;
    const subtotal = +(total / (1 + IGV_RATE)).toFixed(2);
    setEditing((e) => ({ ...e, total, subtotal, igv: +(total - subtotal).toFixed(2) }));
  };

  const save = async () => {
    if (!editing.supplier_name?.trim()) return toast.error("Indica el proveedor");
    if (!editing.doc_number?.trim()) return toast.error("Indica el número del comprobante");
    const payload = {
      supplier_name: editing.supplier_name.trim(),
      supplier_ruc: editing.supplier_ruc?.trim() || null,
      doc_type: editing.doc_type ?? "Boleta",
      doc_number: editing.doc_number.trim().toUpperCase(),
      purchase_date: editing.purchase_date,
      subtotal: Number(editing.subtotal) || 0,
      igv: Number(editing.igv) || 0,
      total: Number(editing.total) || 0,
      payment_method: editing.payment_method ?? "Efectivo",
      notes: editing.notes?.trim() || null,
      image_url: editing.image_url ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("purchases").update(payload).eq("id", editing.id)
      : await supabase.from("purchases").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Compra registrada"); setOpen(false); setEditing(empty); load();
  };

  const remove = async (p: P) => {
    if (!(await confirm({
      title: `¿Eliminar la compra ${p.doc_number}?`,
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      destructive: true,
    }))) return;
    const { error } = await supabase.from("purchases").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada"); load();
  };

  const openImage = async (p: P) => {
    const url = await signedMediaUrl(p.image_url);
    if (!url) return toast.error("Sin comprobante adjunto");
    setViewer({ open: true, url, title: `${p.doc_type} ${p.doc_number}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">Compras a proveedores</h1>
          <p className="text-sm text-muted-foreground">Registro interno. Los clientes solo ven las boletas que emites tú.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Registrar compra</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Editar" : "Nueva"} compra</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <F label="Proveedor"><Input value={editing.supplier_name ?? ""} onChange={(e) => setEditing({ ...editing, supplier_name: e.target.value })} /></F>
              <F label="RUC del proveedor"><Input value={editing.supplier_ruc ?? ""} onChange={(e) => setEditing({ ...editing, supplier_ruc: e.target.value })} /></F>
              <F label="Tipo de comprobante">
                <Select value={editing.doc_type} onValueChange={(v) => setEditing({ ...editing, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="N° de comprobante"><Input value={editing.doc_number ?? ""} onChange={(e) => setEditing({ ...editing, doc_number: e.target.value })} /></F>
              <F label="Fecha"><Input type="date" value={editing.purchase_date ?? ""} onChange={(e) => setEditing({ ...editing, purchase_date: e.target.value })} /></F>
              <F label="Forma de pago">
                <Select value={editing.payment_method} onValueChange={(v) => setEditing({ ...editing, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Total pagado (S/)">
                <Input type="number" step="0.01" value={editing.total ?? 0} onChange={(e) => setTotal(parseFloat(e.target.value))} />
              </F>
              <F label="Desglose automático">
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  Subtotal {formatSoles(editing.subtotal ?? 0)} · IGV {formatSoles(editing.igv ?? 0)}
                </div>
              </F>
              <div className="sm:col-span-2">
                <F label="Notas"><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></F>
              </div>
              <div className="sm:col-span-2">
                <F label="Foto / escaneo del comprobante del proveedor">
                  <MediaUpload folder="purchases" value={editing.image_url} onChange={(p) => setEditing({ ...editing, image_url: p })} hint="Solo visible para el personal" />
                </F>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Compras registradas" value={String(totals.count)} />
        <Kpi label="Gasto del mes" value={formatSoles(totals.month)} />
        <Kpi label="Gasto acumulado" value={formatSoles(totals.total)} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por proveedor, RUC o comprobante" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead>Comprobante</TableHead>
              <TableHead>Pago</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap">{formatDate(p.purchase_date)}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.supplier_name}</div>
                  <div className="text-xs text-muted-foreground">{p.supplier_ruc ? `RUC ${p.supplier_ruc}` : "—"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="mr-1">{p.doc_type}</Badge>
                  <span className="font-mono text-xs">{p.doc_number}</span>
                </TableCell>
                <TableCell className="text-xs">{p.payment_method}</TableCell>
                <TableCell className="text-right font-bold">{formatSoles(p.total)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {p.image_url && (
                    <Button size="icon" variant="ghost" onClick={() => openImage(p)}><FileImage className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                <Truck className="mx-auto mb-2 h-6 w-6 opacity-40" />
                Aún no registras compras a proveedores.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={viewer.open} onOpenChange={(o) => setViewer({ ...viewer, open: o })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewer.title}</DialogTitle></DialogHeader>
          {viewer.url && <img src={viewer.url} alt={viewer.title} className="max-h-[70vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}

export default Purchases;

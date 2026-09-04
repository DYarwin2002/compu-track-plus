import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/frontend/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Plus, Pencil, Search, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/frontend/hooks/use-auth";
import { useConfirm } from "@/frontend/components/confirm-dialog";
import { useAlert } from "@/frontend/components/alert-modal";



type C = { id: string; document: string; full_name: string; phone: string | null; email: string | null; address: string | null };
const empty: Partial<C> = { document: "", full_name: "", phone: "", email: "", address: "" };

function Customers() {
  const { isAdmin } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const { alert, alertModal } = useAlert();
  const [rows, setRows] = useState<C[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<C>>(empty);
  const [history, setHistory] = useState<{ open: boolean; name: string; rows: Array<{ id: string; sale_number: string; sale_date: string; total: number }> }>({ open: false, name: "", rows: [] });

  const load = async () => {
    let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (q) query = query.or(`full_name.ilike.%${q}%,document.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data } = await query;
    setRows((data ?? []) as C[]);
  };
  useEffect(() => { load(); }, [q]);

  const save = async () => {
    if (!editing.document?.trim() || !editing.full_name?.trim()) {
      return alert({
        title: "Faltan datos obligatorios",
        description: "El DNI / RUC y los nombres y apellidos son obligatorios para guardar el cliente.",
      });
    }
    const { error } = editing.id
      ? await supabase.from("customers").update(editing).eq("id", editing.id)
      : await supabase.from("customers").insert(editing as never);
    if (error) return alert({ title: "No se pudo guardar el cliente", description: error.message });
    toast.success("Guardado"); setOpen(false); setEditing(empty); load();
  };

  const showHistory = async (c: C) => {
    const { data } = await supabase.from("sales").select("id, sale_number, sale_date, total").eq("customer_id", c.id).order("sale_date", { ascending: false });
    setHistory({ open: true, name: c.full_name, rows: (data ?? []) as never });
  };

  const removeCustomer = async (c: C) => {
    if (!(await confirm({
      title: `¿Eliminar a ${c.full_name}?`,
      description: "Sus pedidos quedarán sin cliente asignado.",
      confirmText: "Eliminar cliente",
      destructive: true,
    }))) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return alert({ title: "No se pudo eliminar", description: error.message });
    toast.success("Cliente eliminado"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-black">Clientes</h1><p className="text-sm text-muted-foreground">Base de datos de clientes.</p></div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nuevo cliente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Editar" : "Nuevo"} cliente</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <F label="DNI / RUC *"><Input value={editing.document ?? ""} onChange={(e) => setEditing({ ...editing, document: e.target.value })} /></F>
              <F label="Nombres y apellidos *"><Input value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></F>
              <F label="Teléfono"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></F>
              <F label="Correo"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></F>
              <div className="sm:col-span-2"><F label="Dirección"><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></F></div>
            </div>
            <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, documento o teléfono" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Correo</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.document}</TableCell>
                <TableCell className="font-medium">{c.full_name}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => showHistory(c)}><User className="mr-1 h-3 w-3" /> Historial</Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeCustomer(c)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Sin clientes</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={history.open} onOpenChange={(o) => setHistory({ ...history, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historial — {history.name}</DialogTitle></DialogHeader>
          {history.rows.length === 0 ? <p className="text-sm text-muted-foreground">Sin compras registradas.</p> : (
            <ul className="divide-y divide-border">
              {history.rows.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div><p className="font-medium">{s.sale_number}</p><p className="text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleString("es-PE")}</p></div>
                  <p className="font-bold">S/ {Number(s.total).toFixed(2)}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
      {alertModal}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}

export default Customers;

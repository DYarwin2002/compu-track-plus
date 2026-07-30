import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatSoles } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { MediaUpload } from "@/components/media-upload";
import { signedMediaUrls } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Productos — ServiCompu Yarango" }, { name: "description", content: "Inventario de productos." }] }),
  component: Products,
});

type Product = {
  id: string; sku: string; name: string; brand: string | null; model: string | null; serial_number: string | null;
  category: string; purchase_price: number; sale_price: number; stock: number; condition: string; default_warranty_months: number;
  image_url: string | null;
};

const CATEGORIES = ["Laptop", "PC", "Monitor", "Impresora", "SSD", "RAM", "Accesorio", "Otro"];
const CONDITIONS = ["Nuevo", "Usado", "Reacondicionado"];

const empty: Partial<Product> = { sku: "", name: "", brand: "", model: "", serial_number: "", category: "Laptop", purchase_price: 0, sale_price: 0, stock: 1, condition: "Nuevo", default_warranty_months: 12, image_url: null };

function Products() {
  const { role, can } = useAuth();
  const canManage = can("products.manage");
  const canViewCost = can("products.view_cost");
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>(empty);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const load = async () => {
    let query = supabase.from("products").select("*").order("created_at", { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,model.ilike.%${q}%,serial_number.ilike.%${q}%,sku.ilike.%${q}%`);
    const { data } = await query;
    const list = (data ?? []) as Product[];
    setRows(list);
    const paths = list.map((p) => p.image_url).filter((p): p is string => !!p);
    setThumbs(paths.length ? await signedMediaUrls(paths) : {});
  };
  useEffect(() => { load(); }, [q]);

  const save = async () => {
    const payload = { ...editing, purchase_price: Number(editing.purchase_price) || 0, sale_price: Number(editing.sale_price) || 0, stock: Number(editing.stock) || 0, default_warranty_months: Number(editing.default_warranty_months) || 12 };
    const { error } = editing.id
      ? await supabase.from("products").update(payload as never).eq("id", editing.id)
      : await supabase.from("products").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-black">Productos</h1><p className="text-sm text-muted-foreground">Inventario y control de stock.</p></div>
        {canManage && <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nuevo producto</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing.id ? "Editar" : "Nuevo"} producto</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="SKU / Código"><Input value={editing.sku ?? ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></Field>
              <Field label="Nombre"><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Marca"><Input value={editing.brand ?? ""} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} /></Field>
              <Field label="Modelo"><Input value={editing.model ?? ""} onChange={(e) => setEditing({ ...editing, model: e.target.value })} /></Field>
              <Field label="N° de serie"><Input value={editing.serial_number ?? ""} onChange={(e) => setEditing({ ...editing, serial_number: e.target.value })} /></Field>
              <Field label="Categoría">
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Estado">
                <Select value={editing.condition} onValueChange={(v) => setEditing({ ...editing, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {canViewCost && <Field label="Precio de compra"><Input type="number" step="0.01" value={editing.purchase_price ?? 0} onChange={(e) => setEditing({ ...editing, purchase_price: parseFloat(e.target.value) })} /></Field>}
              <Field label="Precio de venta"><Input type="number" step="0.01" value={editing.sale_price ?? 0} onChange={(e) => setEditing({ ...editing, sale_price: parseFloat(e.target.value) })} /></Field>
              <Field label="Stock"><Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: parseInt(e.target.value) })} /></Field>
              <Field label="Garantía (meses)"><Input type="number" value={editing.default_warranty_months ?? 12} onChange={(e) => setEditing({ ...editing, default_warranty_months: parseInt(e.target.value) })} /></Field>
              <div className="sm:col-span-2">
                <Field label="Foto para el catálogo">
                  <MediaUpload folder="products" value={editing.image_url} onChange={(p) => setEditing({ ...editing, image_url: p })} />
                </Field>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, modelo, serie o SKU" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead><TableHead>SKU</TableHead><TableHead>Producto</TableHead><TableHead>Serie</TableHead>
              <TableHead>Categoría</TableHead><TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-md border border-border bg-muted">
                    {p.image_url && thumbs[p.image_url]
                      ? <img src={thumbs[p.image_url]} alt={p.name} className="h-full w-full object-cover" />
                      : <span className="text-[10px] text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.brand} {p.model}</div></TableCell>
                <TableCell className="font-mono text-xs">{p.serial_number ?? "—"}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell className="text-right font-medium">{formatSoles(p.sale_price)}</TableCell>
                <TableCell className="text-right"><Badge variant={p.stock === 0 ? "destructive" : p.stock < 3 ? "secondary" : "default"}>{p.stock}</Badge></TableCell>
                <TableCell><Badge variant="outline">{p.condition}</Badge></TableCell>
                <TableCell className="text-right">
                  {canManage && <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                  {role === "admin" && <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin productos</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}

import {useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/frontend/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/frontend/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Trash2, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { IGV_RATE, formatSoles } from "@/frontend/lib/format";
import { useAuth } from "@/frontend/hooks/use-auth";
import { sendBoletaWhatsApp } from "@/frontend/lib/whatsapp";



type Product = { id: string; name: string; sku: string; sale_price: number; stock: number; serial_number: string | null; default_warranty_months: number };
type Customer = { id: string; document: string; full_name: string; phone?: string | null };
type LineItem = { key: string; product_id: string | null; product_name: string; serial_number: string; quantity: number; unit_price: number; warranty_months: number };

function NewSale() {
  const nav = useNavigate();
  const { user, can } = useAuth();
  const canCreate = can("sales.create");
  const canCreateCustomer = can("customers.manage");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [payment, setPayment] = useState("Efectivo");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [openProduct, setOpenProduct] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  // Quick customer create
  const [newCust, setNewCust] = useState({ document: "", full_name: "", phone: "" });

  useEffect(() => {
    supabase.from("customers").select("id, document, full_name, phone").order("full_name").then(({ data }) => setCustomers((data ?? []) as Customer[]));
    supabase.from("products").select("id, name, sku, sale_price, stock, serial_number, default_warranty_months").gt("stock", 0).order("name").then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const addProduct = (p: Product) => {
    setItems((x) => [...x, {
      key: crypto.randomUUID(), product_id: p.id, product_name: p.name,
      serial_number: p.serial_number ?? "", quantity: 1, unit_price: Number(p.sale_price),
      warranty_months: 12, // Garantía fija de 1 año desde la fecha de venta
    }]);
    setOpenProduct(false);
  };
  const removeItem = (k: string) => setItems((x) => x.filter((i) => i.key !== k));
  const updateItem = (k: string, patch: Partial<LineItem>) => setItems((x) => x.map((i) => i.key === k ? { ...i, ...patch } : i));

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const disc = Math.min(discount, subtotal);
    const base = subtotal - disc;
    const gravado = base / (1 + IGV_RATE);
    const igv = base - gravado;
    return { subtotal, discount: disc, gravado, igv, total: base };
  }, [items, discount]);

  const createCustomer = async () => {
    if (!canCreateCustomer) return toast.error("No tienes permiso para crear clientes");
    if (!newCust.document || !newCust.full_name) return toast.error("DNI/RUC y nombre son obligatorios");
    const { data, error } = await supabase.from("customers").insert(newCust).select().single();
    if (error) return toast.error(error.message);
    setCustomers((c) => [...c, data as Customer]); setCustomerId(data.id);
    setNewCust({ document: "", full_name: "", phone: "" });
    toast.success("Cliente creado");
  };

  const submit = async () => {
    if (!canCreate) return toast.error("No tienes permiso para registrar ventas");
    if (items.length === 0) return toast.error("Agrega al menos un producto");
    setSaving(true);
    const { data: sale, error } = await supabase.from("sales").insert({
      customer_id: customerId, payment_method: payment as never,
      subtotal: totals.subtotal, discount: totals.discount, igv: totals.igv, total: totals.total,
      created_by: user?.id,
    }).select().single();
    if (error || !sale) { setSaving(false); return toast.error(error?.message ?? "Error"); }
    const payload = items.map((i) => ({
      sale_id: sale.id, product_id: i.product_id, product_name: i.product_name,
      serial_number: i.serial_number || null, quantity: i.quantity, unit_price: i.unit_price,
      line_total: i.quantity * i.unit_price, warranty_months: i.warranty_months,
    }));
    const { error: itemsErr } = await supabase.from("sale_items").insert(payload);
    setSaving(false);
    if (itemsErr) return toast.error(itemsErr.message);
    toast.success(`Venta ${sale.sale_number} registrada`);
    const cust = customers.find((c) => c.id === customerId);
    toast("¿Enviar la boleta por WhatsApp?", {
      duration: 10000,
      action: {
        label: "Enviar",
        onClick: () =>
          sendBoletaWhatsApp({
            sale_number: sale.sale_number,
            total: totals.total,
            customer_name: cust?.full_name ?? null,
            customer_document: cust?.document ?? null,
            customer_phone: cust?.phone ?? null,
          }),
      },
    });
    nav({ to: "/sales/$id", params: { id: sale.id } });
  };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black">Nueva venta</h1><p className="text-sm text-muted-foreground">Registra productos, cliente y método de pago.</p></div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle>Productos</CardTitle>
            <Popover open={openProduct} onOpenChange={setOpenProduct}>
              <PopoverTrigger asChild><Button size="sm"><Plus className="mr-1 h-3 w-3" /> Agregar</Button></PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar por nombre, SKU o serie…" />
                  <CommandList>
                    <CommandEmpty>Sin resultados</CommandEmpty>
                    <CommandGroup>
                      {products.map((p) => (
                        <CommandItem key={p.id} value={`${p.name} ${p.sku} ${p.serial_number ?? ""}`} onSelect={() => addProduct(p)}>
                          <div className="flex-1"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.sku} · Stock {p.stock}</p></div>
                          <span className="text-sm font-bold">{formatSoles(p.sale_price)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Serie</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Garantía</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.key}>
                    <TableCell className="font-medium">{i.product_name}</TableCell>
                    <TableCell><Input value={i.serial_number} onChange={(e) => updateItem(i.key, { serial_number: e.target.value })} placeholder="N° serie" className="h-8 w-32 font-mono text-xs" /></TableCell>
                    <TableCell><Input type="number" min={1} value={i.quantity} onChange={(e) => updateItem(i.key, { quantity: parseInt(e.target.value) || 1 })} className="h-8 w-16" /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={i.unit_price} onChange={(e) => updateItem(i.key, { unit_price: parseFloat(e.target.value) || 0 })} className="h-8 w-24" /></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">1 año</TableCell>
                    <TableCell className="text-right font-bold">{formatSoles(i.quantity * i.unit_price)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => removeItem(i.key)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Agrega productos</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {customerId ? customers.find((c) => c.id === customerId)?.full_name : "Seleccionar cliente…"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente…" />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setCustomerId(null); setOpenCustomer(false); }}>Sin cliente (mostrador)</CommandItem>
                        {customers.map((c) => (
                          <CommandItem key={c.id} value={`${c.full_name} ${c.document}`} onSelect={() => { setCustomerId(c.id); setOpenCustomer(false); }}>
                            {customerId === c.id && <Check className="mr-1 h-3 w-3" />}
                            <div><p className="font-medium">{c.full_name}</p><p className="text-xs text-muted-foreground">{c.document}</p></div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {canCreateCustomer && <div className="rounded-lg border border-dashed border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">O crea uno rápido</p>
                <div className="space-y-2">
                  <Input placeholder="DNI / RUC" value={newCust.document} onChange={(e) => setNewCust({ ...newCust, document: e.target.value })} />
                  <Input placeholder="Nombre completo" value={newCust.full_name} onChange={(e) => setNewCust({ ...newCust, full_name: e.target.value })} />
                  <Input placeholder="Teléfono" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
                  <Button size="sm" variant="secondary" className="w-full" onClick={createCustomer}>Crear cliente</Button>
                </div>
              </div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Totales</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatSoles(totals.subtotal)}</span></div>
              <div>
                <Label className="mb-1 block text-xs">Descuento</Label>
                <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Op. gravada</span><span>{formatSoles(totals.gravado)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGV (18%)</span><span>{formatSoles(totals.igv)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 text-lg font-black"><span>Total</span><span>{formatSoles(totals.total)}</span></div>
              <div>
                <Label className="mb-1 block text-xs">Método de pago</Label>
                <Select value={payment} onValueChange={setPayment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Efectivo", "Yape", "Transferencia", "Tarjeta"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" size="lg" onClick={submit} disabled={saving || items.length === 0 || !canCreate}>
                {saving ? "Registrando…" : canCreate ? "Registrar venta" : "Sin permiso"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default NewSale;

import {Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/database/client";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Printer, ArrowLeft, Download, Trash2, MessageCircle } from "lucide-react";
import { formatSoles, formatDateTime } from "@/frontend/lib/format";
import { downloadBoletaPDF } from "@/frontend/lib/boleta-pdf";
import { sendBoletaWhatsApp } from "@/frontend/lib/whatsapp";
import { BUSINESS } from "@/frontend/lib/business";
import { useAuth } from "@/frontend/hooks/use-auth";
import { toast } from "sonner";



type SaleFull = {
  id: string; sale_number: string; sale_date: string; subtotal: number; discount: number; igv: number; total: number;
  payment_method: string; notes: string | null; customers: { full_name: string; document: string; address: string | null; phone: string | null } | null;
  sale_items: Array<{ id: string; product_name: string; serial_number: string | null; quantity: number; unit_price: number; line_total: number; warranty_months: number }>;
};

function SaleDetail() {
  const { id } = useParams({ from: "/_authenticated/sales/$id" });
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [sale, setSale] = useState<SaleFull | null>(null);
  const [format, setFormat] = useState<"a4" | "thermal">("a4");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sales").select("*, customers(full_name, document, address, phone), sale_items(*)").eq("id", id).single();
      setSale(data as never);
    })();
  }, [id]);

  if (!sale) return <div className="text-muted-foreground">Cargando…</div>;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/sales"><ArrowLeft className="mr-1 h-4 w-4" /> Volver</Link></Button>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            <button onClick={() => setFormat("a4")} className={`px-3 py-1.5 text-xs ${format === "a4" ? "bg-primary text-primary-foreground" : ""}`}>A4</button>
            <button onClick={() => setFormat("thermal")} className={`px-3 py-1.5 text-xs ${format === "thermal" ? "bg-primary text-primary-foreground" : ""}`}>Térmico 80mm</button>
          </div>
          <Button variant="outline" onClick={() => {
            if (!sale) return;
            downloadBoletaPDF({
              sale_number: sale.sale_number,
              sale_date: sale.sale_date,
              subtotal: Number(sale.subtotal),
              discount: Number(sale.discount),
              igv: Number(sale.igv),
              total: Number(sale.total),
              payment_method: sale.payment_method,
              customer: sale.customers,
              items: sale.sale_items.map((i) => ({
                product_name: i.product_name,
                serial_number: i.serial_number,
                quantity: Number(i.quantity),
                unit_price: Number(i.unit_price),
                line_total: Number(i.line_total),
                warranty_months: Number(i.warranty_months),
              })),
            });
          }}><Download className="mr-2 h-4 w-4" /> PDF</Button>
          <Button
            variant="outline"
            onClick={() => {
              const ok = sendBoletaWhatsApp({
                sale_number: sale.sale_number,
                total: Number(sale.total),
                customer_name: sale.customers?.full_name ?? null,
                customer_document: sale.customers?.document ?? null,
                customer_phone: sale.customers?.phone ?? null,
              });
              if (!ok) toast.info("El cliente no tiene teléfono: elige el contacto en WhatsApp");
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm(`¿Eliminar la boleta ${sale.sale_number}? Se borrarán sus productos y garantías.`)) return;
                const { error } = await supabase.from("sales").delete().eq("id", sale.id);
                if (error) return toast.error(error.message);
                toast.success("Venta eliminada");
                navigate({ to: "/sales" });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          )}
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>
      </div>

      {format === "a4" ? <BoletaA4 sale={sale} /> : <BoletaThermal sale={sale} />}
    </div>
  );
}

function BoletaA4({ sale }: { sale: SaleFull }) {
  return (
    <Card className="mx-auto max-w-3xl p-8 print:border-0 print:shadow-none">
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black">{BUSINESS.name}</h2>
          <p className="text-xs text-muted-foreground">{BUSINESS.tagline}</p>
          <p className="text-xs font-semibold">RUC {BUSINESS.ruc}</p>
          <p className="text-xs text-muted-foreground">{BUSINESS.address}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Boleta de venta</p>
          <p className="text-xl font-black">{sale.sale_number}</p>
          <p className="text-xs">{formatDateTime(sale.sale_date)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-b border-border py-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-medium">{sale.customers?.full_name ?? "Cliente mostrador"}</p>
          <p className="text-xs">{sale.customers?.document ?? ""}</p>
          <p className="text-xs">{sale.customers?.address ?? ""}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Método de pago</p>
          <p className="font-medium">{sale.payment_method}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <tr><th className="py-2">Producto</th><th>Serie</th><th>Cant.</th><th>Precio</th><th className="text-right">Total</th></tr>
        </thead>
        <tbody>
          {sale.sale_items.map((i) => (
            <tr key={i.id} className="border-b border-border">
              <td className="py-2">{i.product_name}<div className="text-xs text-muted-foreground">Garantía: {i.warranty_months} meses</div></td>
              <td className="font-mono text-xs">{i.serial_number ?? "—"}</td>
              <td>{i.quantity}</td>
              <td>{formatSoles(i.unit_price)}</td>
              <td className="text-right font-medium">{formatSoles(i.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatSoles(sale.subtotal)}</span></div>
        {sale.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span>-{formatSoles(sale.discount)}</span></div>}
        <div className="flex justify-between"><span className="text-muted-foreground">IGV (18%)</span><span>{formatSoles(sale.igv)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 text-lg font-black"><span>TOTAL</span><span>{formatSoles(sale.total)}</span></div>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Gracias por su compra. Conserve esta boleta para hacer válida su garantía.</p>
    </Card>
  );
}

function BoletaThermal({ sale }: { sale: SaleFull }) {
  return (
    <div className="mx-auto bg-white p-3 text-black" style={{ width: "80mm", fontFamily: "monospace", fontSize: "11px" }}>
      <div className="text-center">
        <p className="text-base font-bold">{BUSINESS.name}</p>
        <p>RUC {BUSINESS.ruc}</p>
        <p>Venta y reparación</p>
        <p>================================</p>
        <p className="font-bold">BOLETA {sale.sale_number}</p>
        <p>{formatDateTime(sale.sale_date)}</p>
        <p>================================</p>
      </div>
      <p>Cliente: {sale.customers?.full_name ?? "Mostrador"}</p>
      <p>Doc: {sale.customers?.document ?? "—"}</p>
      <p>--------------------------------</p>
      {sale.sale_items.map((i) => (
        <div key={i.id} className="mb-1">
          <p>{i.product_name}</p>
          {i.serial_number && <p>  SN: {i.serial_number}</p>}
          <p>  {i.quantity} x {Number(i.unit_price).toFixed(2)} = {Number(i.line_total).toFixed(2)}</p>
          <p>  Garantía: {i.warranty_months} meses</p>
        </div>
      ))}
      <p>--------------------------------</p>
      <p>Subtotal: S/ {Number(sale.subtotal).toFixed(2)}</p>
      {sale.discount > 0 && <p>Descuento: -S/ {Number(sale.discount).toFixed(2)}</p>}
      <p>IGV 18%: S/ {Number(sale.igv).toFixed(2)}</p>
      <p className="text-base font-bold">TOTAL: S/ {Number(sale.total).toFixed(2)}</p>
      <p>Pago: {sale.payment_method}</p>
      <p>================================</p>
      <p className="text-center">¡Gracias por su compra!</p>
      <p className="text-center">Conserve esta boleta</p>
    </div>
  );
}

export default SaleDetail;

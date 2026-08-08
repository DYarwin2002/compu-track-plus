import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BUSINESS } from "./business";

export type CotizacionItem = {
  name: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  sale_price: number;
  default_warranty_months?: number | null;
};

const money = (n: number) =>
  "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Genera una cotización profesional en PDF para el cliente del catálogo. */
export function generateCotizacionPDF(items: CotizacionItem[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date();
  const valid = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const code = "COT-" + now.getTime().toString(36).toUpperCase().slice(-8);

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(BUSINESS.name, 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`RUC ${BUSINESS.ruc} · ${BUSINESS.address}`, 14, 18);
  doc.text(`WhatsApp +${BUSINESS.whatsapp}`, 14, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("COTIZACION", W - 14, 12, { align: "right" });
  doc.setFontSize(14);
  doc.text(code, W - 14, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(now.toLocaleDateString("es-PE"), W - 14, 23, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.text(`Valida hasta: ${valid.toLocaleDateString("es-PE")}`, 14, 34);
  doc.text("Precios en soles, incluyen IGV. Sujetos a disponibilidad de stock.", 14, 39);

  autoTable(doc, {
    startY: 45,
    head: [["#", "Producto", "Detalle", "Garantia", "Precio"]],
    body: items.map((i, n) => [
      String(n + 1),
      i.name,
      [i.brand, i.model, i.category].filter(Boolean).join(" · ") || "-",
      `${i.default_warranty_months ?? 12} meses`,
      money(i.sale_price),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, valign: "top" },
    headStyles: { fillColor: [30, 30, 40], textColor: 255, halign: "left" },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      3: { halign: "center", cellWidth: 24 },
      4: { halign: "right", cellWidth: 30, fontStyle: "bold" },
    },
    theme: "striped",
  });

  const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 8;
  const total = items.reduce((s, i) => s + Number(i.sale_price || 0), 0);
  doc.setDrawColor(200);
  doc.line(W - 84, finalY - 3, W - 14, finalY - 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL REFERENCIAL", W - 84, finalY + 3);
  doc.text(money(total), W - 14, finalY + 3, { align: "right" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("Documento informativo, no valido como comprobante de pago.", W / 2, 285, { align: "center" });
  doc.text("Consulta garantias y boletas en el portal de clientes.", W / 2, 290, { align: "center" });

  return doc;
}

export function downloadCotizacionPDF(items: CotizacionItem[]) {
  generateCotizacionPDF(items).save(`Cotizacion-${BUSINESS.name.replace(/\s+/g, "")}.pdf`);
}
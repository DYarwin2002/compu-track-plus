import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type BoletaData = {
  sale_number: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  igv: number;
  total: number;
  payment_method: string;
  customer: { full_name: string; document: string; address?: string | null; phone?: string | null } | null;
  items: Array<{
    product_name: string;
    serial_number: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    warranty_months: number;
  }>;
};

const money = (n: number) =>
  "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generateBoletaPDF(data: BoletaData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Brand header band
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ServiCompu Yarango", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Venta y reparacion de computadoras", 14, 18);
  doc.text("Portal de clientes: /consultar", 14, 23);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BOLETA DE VENTA", W - 14, 12, { align: "right" });
  doc.setFontSize(14);
  doc.text(data.sale_number, W - 14, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(data.sale_date).toLocaleString("es-PE"), W - 14, 23, { align: "right" });

  // Customer + payment
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  const y0 = 34;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 14, y0);
  doc.text("Metodo de pago", W - 14, y0, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(data.customer?.full_name ?? "Cliente mostrador", 14, y0 + 5);
  doc.text(`Doc: ${data.customer?.document ?? "-"}`, 14, y0 + 10);
  if (data.customer?.address) doc.text(String(data.customer.address).slice(0, 80), 14, y0 + 15);
  doc.text(data.payment_method, W - 14, y0 + 5, { align: "right" });

  // Items table
  autoTable(doc, {
    startY: y0 + 22,
    head: [["Producto", "Serie", "Cant.", "P. Unit", "Total"]],
    body: data.items.map((i) => [
      `${i.product_name}\nGarantia: ${i.warranty_months} meses`,
      i.serial_number ?? "-",
      String(i.quantity),
      money(i.unit_price),
      money(i.line_total),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, valign: "top" },
    headStyles: { fillColor: [30, 30, 40], textColor: 255, halign: "left" },
    columnStyles: {
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 30, fontStyle: "bold" },
    },
    theme: "striped",
  });

  const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 6;

  // Totals block
  const x = W - 74;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const line = (label: string, val: string, y: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, x, y);
    doc.text(val, W - 14, y, { align: "right" });
  };
  line("Subtotal", money(data.subtotal), finalY);
  if (data.discount > 0) line("Descuento", "-" + money(data.discount), finalY + 5);
  const y1 = finalY + (data.discount > 0 ? 10 : 5);
  line("IGV (18%)", money(data.igv), y1);
  doc.setDrawColor(200);
  doc.line(x, y1 + 2, W - 14, y1 + 2);
  doc.setFontSize(12);
  line("TOTAL", money(data.total), y1 + 8, true);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(110);
  doc.text(
    "Gracias por su compra. Conserve esta boleta para hacer valida su garantia.",
    W / 2,
    285,
    { align: "center" },
  );
  doc.text(
    "Consulta tu garantia o descarga tu boleta en el portal de clientes.",
    W / 2,
    290,
    { align: "center" },
  );

  return doc;
}

export function downloadBoletaPDF(data: BoletaData) {
  const doc = generateBoletaPDF(data);
  doc.save(`Boleta-${data.sale_number}.pdf`);
}
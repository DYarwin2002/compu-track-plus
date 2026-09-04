import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { BUSINESS } from "./business";
import logoServi from "@/assets/logo-sebas-urban.jpg.asset.json";

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

/** Convierte una imagen (misma web o CDN) a dataURL para incrustarla en el PDF. */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ",
  "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"];
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS",
  "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function centenasATexto(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const resto =
    r <= 20 ? UNIDADES[r] : r % 10 === 0 ? DECENAS[Math.floor(r / 10)] : `${DECENAS[Math.floor(r / 10)]} Y ${UNIDADES[r % 10]}`;
  return [CENTENAS[c], resto].filter(Boolean).join(" ");
}

/** Importe en letras, como exige una boleta de venta peruana. */
export function montoEnLetras(total: number): string {
  const entero = Math.floor(Math.abs(total));
  const centimos = Math.round((Math.abs(total) - entero) * 100);
  let texto: string;
  if (entero === 0) texto = "CERO";
  else if (entero < 1000) texto = centenasATexto(entero);
  else {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    const milesTxt = miles === 1 ? "MIL" : `${centenasATexto(miles)} MIL`;
    texto = [milesTxt, resto ? centenasATexto(resto) : ""].filter(Boolean).join(" ");
  }
  return `SON: ${texto} CON ${String(centimos).padStart(2, "0")}/100 SOLES`;
}

const BLUE: [number, number, number] = [37, 99, 235];
const DARK: [number, number, number] = [17, 24, 39];

/** Boleta de venta A4 con logo, datos del emisor, QR de verificacion y firma. */
export async function generateBoletaPDF(data: BoletaData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${origin}${BUSINESS.portal}`;
  const [logo, qr] = await Promise.all([
    toDataUrl(logoServi.url),
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 240 }).catch(() => null),
  ]);

  /* ---------- Cabecera: emisor + recuadro del comprobante ---------- */
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 4, "F");

  if (logo) {
    doc.addImage(logo, "JPEG", M, 10, 24, 24, undefined, "FAST");
  }
  const tx = logo ? M + 29 : M;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(BUSINESS.name, tx, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text(BUSINESS.tagline, tx, 22);
  doc.text(BUSINESS.address, tx, 26.5);
  doc.text(`WhatsApp +${BUSINESS.whatsapp}  ·  Lunes a Domingo 9:00 - 19:00`, tx, 31);

  // Recuadro del comprobante (estilo SUNAT)
  const bw = 66;
  const bx = W - M - bw;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.6);
  doc.roundedRect(bx, 10, bw, 26, 2, 2, "S");
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`R.U.C. ${BUSINESS.ruc}`, bx + bw / 2, 17, { align: "center" });
  doc.setFillColor(...BLUE);
  doc.rect(bx + 1, 19, bw - 2, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("BOLETA DE VENTA ELECTRONICA", bx + bw / 2, 23.6, { align: "center" });
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.text(data.sale_number, bx + bw / 2, 32.5, { align: "center" });

  /* ---------- Datos del cliente ---------- */
  const y0 = 42;
  doc.setDrawColor(225);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y0, W - M * 2, 26, 2, 2, "S");
  doc.setFillColor(243, 246, 251);
  doc.rect(M + 0.5, y0 + 0.5, W - M * 2 - 1, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text("DATOS DEL CLIENTE", M + 3, y0 + 4.3);
  doc.text("DATOS DEL COMPROBANTE", W / 2 + 3, y0 + 4.3);

  const field = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(value || "-", x + 26, y);
  };
  field("Cliente:", data.customer?.full_name ?? "Cliente mostrador", M + 3, y0 + 12);
  field("DNI / RUC:", data.customer?.document ?? "-", M + 3, y0 + 17.5);
  field("Direccion:", String(data.customer?.address ?? "-").slice(0, 42), M + 3, y0 + 23);
  field("Emision:", new Date(data.sale_date).toLocaleString("es-PE"), W / 2 + 3, y0 + 12);
  field("Moneda:", "SOLES (PEN)", W / 2 + 3, y0 + 17.5);
  field("Pago:", data.payment_method, W / 2 + 3, y0 + 23);

  /* ---------- Detalle ---------- */
  autoTable(doc, {
    startY: y0 + 32,
    margin: { left: M, right: M },
    head: [["#", "Descripcion", "Serie", "Cant.", "P. Unit.", "Importe"]],
    body: data.items.map((i, n) => [
      String(n + 1),
      `${i.product_name}\nGarantia: ${i.warranty_months} meses`,
      i.serial_number ?? "-",
      String(i.quantity),
      money(i.unit_price),
      money(i.line_total),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5, valign: "top", lineColor: [230, 230, 230], lineWidth: 0.1 },
    headStyles: { fillColor: DARK, textColor: 255, halign: "left", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      2: { cellWidth: 30 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "right", cellWidth: 24 },
      5: { halign: "right", cellWidth: 28, fontStyle: "bold" },
    },
    theme: "grid",
  });

  const afterTable = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140) + 8;

  /* ---------- Importe en letras + totales ---------- */
  const boxH = 34;
  doc.setDrawColor(225);
  doc.roundedRect(M, afterTable, W - M * 2 - 78, boxH, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text("IMPORTE EN LETRAS", M + 3, afterTable + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(doc.splitTextToSize(montoEnLetras(data.total), W - M * 2 - 86), M + 3, afterTable + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text("Escanea el codigo QR para verificar tu garantia y descargar tu boleta.", M + 3, afterTable + 26);

  const tx0 = W - M - 74;
  const row = (label: string, val: string, y: number, bold = false, size = 9) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(bold ? 17 : 90);
    doc.text(label, tx0, y);
    doc.setTextColor(...DARK);
    doc.text(val, W - M - 2, y, { align: "right" });
  };
  let ty = afterTable + 5;
  row("Op. Gravada", money(data.subtotal), ty);
  if (data.discount > 0) { ty += 5.5; row("Descuento", "-" + money(data.discount), ty); }
  ty += 5.5;
  row("IGV (18%)", money(data.igv), ty);
  ty += 3.5;
  doc.setFillColor(...BLUE);
  doc.roundedRect(tx0 - 4, ty, 78, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL A PAGAR", tx0, ty + 7.3);
  doc.text(money(data.total), W - M - 4, ty + 7.3, { align: "right" });

  /* ---------- QR + firma ---------- */
  const fy = afterTable + boxH + 14;
  if (qr) doc.addImage(qr, "PNG", M, fy, 30, 30);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Verificacion en linea", M, fy + 34);

  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  doc.line(W - M - 60, fy + 26, W - M, fy + 26);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(BUSINESS.name, W - M - 30, fy + 30, { align: "center" });
  doc.text("Firma y sello autorizado", W - M - 30, fy + 34, { align: "center" });

  /* ---------- Pie legal ---------- */
  doc.setDrawColor(225);
  doc.line(M, H - 22, W - M, H - 22);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text("Representacion impresa de la boleta de venta electronica. Conservela para hacer valida su garantia.", W / 2, H - 17, { align: "center" });
  doc.text("Cambios y garantias sujetos a evaluacion tecnica. No se aceptan devoluciones de dinero.", W / 2, H - 13, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE);
  doc.text(`${BUSINESS.name} · RUC ${BUSINESS.ruc} · ${origin}${BUSINESS.portal}`, W / 2, H - 8, { align: "center" });

  return doc;
}

export async function downloadBoletaPDF(data: BoletaData) {
  const doc = await generateBoletaPDF(data);
  doc.save(`Boleta-${data.sale_number}.pdf`);
}
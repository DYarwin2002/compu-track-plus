import { BUSINESS } from "./business";
import { supabase } from "@/database/client";
import { generateBoletaPDF, type BoletaData } from "./boleta-pdf";

/** Normaliza un teléfono peruano a formato internacional sin "+" (ej. 51995407358). */
export function toWhatsAppNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9) return "51" + digits;
  if (digits.length === 11 && digits.startsWith("51")) return digits;
  if (digits.length > 11 && digits.startsWith("51")) return digits;
  return digits;
}

export type BoletaWhatsAppInfo = {
  sale_number: string;
  total: number;
  customer_name?: string | null;
  customer_document?: string | null;
  customer_phone?: string | null;
};

export function buildBoletaMessage(info: BoletaWhatsAppInfo): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portal = `${origin}${BUSINESS.portal}`;
  const total = "S/ " + Number(info.total || 0).toFixed(2);
  return [
    `¡Hola ${info.customer_name ?? ""}! 👋`.trim(),
    `Gracias por tu compra en *${BUSINESS.name}*.`,
    "",
    `🧾 Boleta: *${info.sale_number}*`,
    `💵 Total: *${total}*`,
    "",
    `Sigue tu pedido y descarga tu boleta aquí:`,
    portal,
    info.customer_document ? `Ingresa con tu DNI: ${info.customer_document}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Abre WhatsApp con la boleta lista para enviar al cliente. */
export function sendBoletaWhatsApp(info: BoletaWhatsAppInfo): boolean {
  const number = toWhatsAppNumber(info.customer_phone);
  const text = encodeURIComponent(buildBoletaMessage(info));
  const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(number);
}

/** Sube la boleta al almacenamiento y devuelve un enlace de descarga directa (1 año). */
export async function uploadBoletaPDF(data: BoletaData): Promise<string | null> {
  try {
    const blob = (await generateBoletaPDF(data)).output("blob");
    const path = `${new Date().getFullYear()}/Boleta-${data.sale_number}.pdf`;
    const { error } = await supabase.storage
      .from("boletas")
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (error) return null;
    const { data: signed } = await supabase.storage.from("boletas").createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export type SendBoletaResult = { ok: boolean; mode: "file" | "link" | "text"; hasNumber: boolean };

/**
 * Envía la boleta en PDF por WhatsApp.
 * En móvil adjunta el archivo real (Web Share); en escritorio envía el enlace de descarga.
 */
export async function sendBoletaPDFWhatsApp(data: BoletaData): Promise<SendBoletaResult> {
  const info: BoletaWhatsAppInfo = {
    sale_number: data.sale_number,
    total: data.total,
    customer_name: data.customer?.full_name ?? null,
    customer_document: data.customer?.document ?? null,
    customer_phone: data.customer?.phone ?? null,
  };
  const number = toWhatsAppNumber(info.customer_phone);

  // 1) Móvil: compartir el PDF directamente (WhatsApp aparece en el menú de compartir)
  try {
    const file = new File([(await generateBoletaPDF(data)).output("blob")], `Boleta-${data.sale_number}.pdf`, {
      type: "application/pdf",
    });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: `Boleta ${data.sale_number}`, text: buildBoletaMessage(info) });
      return { ok: true, mode: "file", hasNumber: Boolean(number) };
    }
  } catch {
    /* el usuario canceló o no hay soporte: seguimos con el enlace */
  }

  // 2) Escritorio: subir el PDF y mandar el enlace de descarga directa
  const url = await uploadBoletaPDF(data);
  const message = url
    ? `${buildBoletaMessage(info)}\n\n📄 Descarga tu boleta en PDF:\n${url}`
    : buildBoletaMessage(info);
  const wa = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(wa, "_blank", "noopener,noreferrer");
  return { ok: Boolean(url), mode: url ? "link" : "text", hasNumber: Boolean(number) };
}

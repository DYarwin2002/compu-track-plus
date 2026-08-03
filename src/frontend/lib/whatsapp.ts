import { BUSINESS } from "./business";

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
    `🛡️ Garantía: 12 meses desde la fecha de venta`,
    "",
    `Descarga tu boleta y revisa tus garantías aquí:`,
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

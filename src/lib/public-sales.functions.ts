import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicSaleSummary = {
  id: string;
  sale_number: string;
  sale_date: string;
  total: number;
};

export type PublicSaleFull = {
  id: string;
  sale_number: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  igv: number;
  total: number;
  payment_method: string;
  customer: { full_name: string; document: string; address: string | null; phone: string | null } | null;
  items: Array<{
    product_name: string;
    serial_number: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    warranty_months: number;
  }>;
};

const numberSchema = z.object({ sale_number: z.string().trim().min(3).max(32) });
const docSchema = z.object({ document: z.string().trim().min(6).max(20) });
const fullSchema = z.object({
  sale_id: z.string().uuid(),
  verifier: z.string().trim().min(3).max(32),
});

function stripSummary(row: {
  id: string;
  sale_number: string;
  sale_date: string;
  total: number | string;
}): PublicSaleSummary {
  return {
    id: row.id,
    sale_number: row.sale_number,
    sale_date: row.sale_date,
    total: Number(row.total ?? 0),
  };
}

/** Public lookup: by sale number (returns single summary or null). */
export const lookupSaleByNumber = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => numberSchema.parse(i))
  .handler(async ({ data }): Promise<PublicSaleSummary | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("sales")
      .select("id, sale_number, sale_date, total")
      .eq("sale_number", data.sale_number.trim().toUpperCase())
      .maybeSingle();
    return row ? stripSummary(row) : null;
  });

/** Public lookup: sales list for a customer document. Never returns PII. */
export const lookupSalesByDocument = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => docSchema.parse(i))
  .handler(async ({ data }): Promise<PublicSaleSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("document", data.document.trim())
      .maybeSingle();
    if (!cust) return [];
    const { data: rows } = await supabaseAdmin
      .from("sales")
      .select("id, sale_number, sale_date, total")
      .eq("customer_id", cust.id)
      .order("sale_date", { ascending: false })
      .limit(50);
    return (rows ?? []).map(stripSummary);
  });

/**
 * Public download: full sale for PDF rendering.
 * `verifier` must match the customer document OR the last 4 chars of sale_number,
 * ensuring random visitors cannot enumerate arbitrary sales.
 */
export const getPublicSalePdfData = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => fullSchema.parse(i))
  .handler(async ({ data }): Promise<PublicSaleFull> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sale, error } = await supabaseAdmin
      .from("sales")
      .select(
        "id, sale_number, sale_date, subtotal, discount, igv, total, payment_method, customers(full_name, document, address, phone), sale_items(product_name, serial_number, quantity, unit_price, line_total, warranty_months)",
      )
      .eq("id", data.sale_id)
      .maybeSingle();
    if (error || !sale) throw new Error("not_found");

    const verifier = data.verifier.trim().toLowerCase();
    const doc = (sale.customers?.document ?? "").toLowerCase();
    const tail = sale.sale_number.slice(-4).toLowerCase();
    if (verifier !== doc && verifier !== tail) throw new Error("not_found");

    return {
      id: sale.id,
      sale_number: sale.sale_number,
      sale_date: sale.sale_date,
      subtotal: Number(sale.subtotal ?? 0),
      discount: Number(sale.discount ?? 0),
      igv: Number(sale.igv ?? 0),
      total: Number(sale.total ?? 0),
      payment_method: sale.payment_method,
      customer: sale.customers
        ? {
            full_name: sale.customers.full_name,
            document: sale.customers.document,
            address: sale.customers.address ?? null,
            phone: sale.customers.phone ?? null,
          }
        : null,
      items: (sale.sale_items ?? []).map((i) => ({
        product_name: i.product_name,
        serial_number: i.serial_number,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
        warranty_months: Number(i.warranty_months),
      })),
    };
  });
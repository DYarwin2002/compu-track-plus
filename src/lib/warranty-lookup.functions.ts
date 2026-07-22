import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({ term: z.string().trim().min(1).max(64) });

export type PublicWarranty = {
  id: string;
  product_name: string;
  serial_number: string | null;
  sale_date: string;
  expires_at: string;
  status: string;
  duration_months: number;
  sale_number: string | null;
};

export const lookupWarranty = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<PublicWarranty[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.term;
    // Try by serial number first (partial), then by exact sale number
    const { data: bySerial, error: e1 } = await supabaseAdmin
      .from("warranties")
      .select("id, product_name, serial_number, sale_date, expires_at, status, duration_months, sales(sale_number)")
      .ilike("serial_number", `%${term}%`)
      .limit(20);
    if (e1) throw new Error("lookup_failed");
    let rows = bySerial ?? [];
    if (rows.length === 0) {
      const { data: sale } = await supabaseAdmin
        .from("sales")
        .select("id")
        .eq("sale_number", term.toUpperCase())
        .maybeSingle();
      if (sale) {
        const { data: w } = await supabaseAdmin
          .from("warranties")
          .select("id, product_name, serial_number, sale_date, expires_at, status, duration_months, sales(sale_number)")
          .eq("sale_id", sale.id)
          .limit(20);
        rows = w ?? [];
      }
    }
    // Strip any customer PII; return only warranty + sale_number
    return rows.map((r: any) => ({
      id: r.id,
      product_name: r.product_name,
      serial_number: r.serial_number,
      sale_date: r.sale_date,
      expires_at: r.expires_at,
      status: r.status,
      duration_months: r.duration_months,
      sale_number: r.sales?.sale_number ?? null,
    }));
    // Note: createClient import kept for tree-shake compatibility
    void createClient;
  });
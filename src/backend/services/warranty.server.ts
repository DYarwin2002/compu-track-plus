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

const COLS =
  "id, product_name, serial_number, sale_date, expires_at, status, duration_months, sales(sale_number)";

/** Busca garantías por número de serie (parcial) o por número de boleta. Nunca devuelve datos del cliente. */
export async function findWarranties(term: string): Promise<PublicWarranty[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: bySerial, error } = await supabaseAdmin
    .from("warranties")
    .select(COLS)
    .ilike("serial_number", `%${term}%`)
    .limit(20);
  if (error) throw new Error("lookup_failed");
  let rows: any[] = bySerial ?? [];
  if (rows.length === 0) {
    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select("id")
      .eq("sale_number", term.toUpperCase())
      .maybeSingle();
    if (sale) {
      const { data: w } = await supabaseAdmin.from("warranties").select(COLS).eq("sale_id", sale.id).limit(20);
      rows = w ?? [];
    }
  }
  return rows.map((r) => ({
    id: r.id,
    product_name: r.product_name,
    serial_number: r.serial_number,
    sale_date: r.sale_date,
    expires_at: r.expires_at,
    status: r.status,
    duration_months: r.duration_months,
    sale_number: r.sales?.sale_number ?? null,
  }));
}

export type WebOrderInput = {
  customer_name: string;
  customer_document: string;
  customer_phone: string;
  customer_address?: string | null;
  notes?: string | null;
  items: Array<{ product_id: string; quantity: number }>;
};

export type WebOrderItemView = {
  product_name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type WebOrderView = {
  order_number: string;
  track_code: string;
  created_at: string;
  status: string;
  total: number;
  items: WebOrderItemView[];
};

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Crea el pedido validando precios y stock en el servidor. */
export async function createWebOrder(input: WebOrderInput): Promise<WebOrderView> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ids = Array.from(new Set(input.items.map((i) => i.product_id)));
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id,name,size,color,sale_price,stock")
    .in("id", ids);

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const lines = input.items.map((i) => {
    const p = byId.get(i.product_id);
    if (!p) throw new Error("producto_no_disponible");
    const qty = Math.max(1, Math.min(Math.floor(i.quantity), 20));
    if (p.stock < qty) throw new Error(`sin_stock:${p.name}`);
    const unit = Number(p.sale_price);
    return {
      product_id: p.id,
      product_name: p.name,
      size: p.size,
      color: p.color,
      quantity: qty,
      unit_price: unit,
      line_total: Number((unit * qty).toFixed(2)),
    };
  });
  if (lines.length === 0) throw new Error("pedido_vacio");

  const total = Number(lines.reduce((s, l) => s + l.line_total, 0).toFixed(2));
  const track_code = randomCode();

  const { data: order, error } = await supabaseAdmin
    .from("web_orders")
    .insert({
      track_code,
      customer_name: input.customer_name.trim(),
      customer_document: input.customer_document.trim(),
      customer_phone: input.customer_phone.trim(),
      customer_address: input.customer_address?.trim() || null,
      notes: input.notes?.trim() || null,
      total,
    })
    .select("id, order_number, track_code, created_at, status, total")
    .single();
  if (error || !order) throw new Error("no_se_pudo_crear");

  const { error: itemsError } = await supabaseAdmin
    .from("web_order_items")
    .insert(lines.map((l) => ({ ...l, order_id: order.id })));
  if (itemsError) {
    await supabaseAdmin.from("web_orders").delete().eq("id", order.id);
    throw new Error("no_se_pudo_crear");
  }

  return {
    order_number: order.order_number,
    track_code: order.track_code,
    created_at: order.created_at,
    status: order.status,
    total: Number(order.total),
    items: lines.map(({ product_name, size, color, quantity, unit_price, line_total }) => ({
      product_name, size, color, quantity, unit_price, line_total,
    })),
  };
}

/** Consulta pública: exige código de seguimiento + DNI del pedido. */
export async function trackWebOrder(track_code: string, document: string): Promise<WebOrderView | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("web_orders")
    .select("id, order_number, track_code, created_at, status, total, customer_document")
    .eq("track_code", track_code.trim().toUpperCase())
    .maybeSingle();
  if (!order) return null;
  if (order.customer_document.trim() !== document.trim()) return null;

  const { data: items } = await supabaseAdmin
    .from("web_order_items")
    .select("product_name, size, color, quantity, unit_price, line_total")
    .eq("order_id", order.id);

  return {
    order_number: order.order_number,
    track_code: order.track_code,
    created_at: order.created_at,
    status: order.status,
    total: Number(order.total),
    items: (items ?? []).map((i) => ({
      product_name: i.product_name,
      size: i.size,
      color: i.color,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      line_total: Number(i.line_total),
    })),
  };
}

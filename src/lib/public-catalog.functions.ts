import { createServerFn } from "@tanstack/react-start";

export type PublicProduct = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string;
  condition: string;
  sale_price: number;
  stock: number;
  default_warranty_months: number;
  image_url: string | null;
};

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicProduct[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("products")
      .select("id,name,brand,model,category,condition,sale_price,stock,default_warranty_months,image_url")
      .gt("stock", 0)
      .order("sale_price", { ascending: false })
      .limit(60);
    const rows = (data ?? []) as PublicProduct[];
    const paths = rows.map((r) => r.image_url).filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { data: signed } = await supabaseAdmin.storage
        .from("media")
        .createSignedUrls(Array.from(new Set(paths)), 60 * 60 * 12);
      const map = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
      for (const r of rows) if (r.image_url) r.image_url = map.get(r.image_url) ?? null;
    }
    return rows;
  },
);

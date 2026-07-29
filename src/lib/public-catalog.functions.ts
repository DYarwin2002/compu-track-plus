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
};

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicProduct[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("products")
      .select("id,name,brand,model,category,condition,sale_price,stock,default_warranty_months")
      .gt("stock", 0)
      .order("sale_price", { ascending: false })
      .limit(60);
    return (data ?? []) as PublicProduct[];
  },
);

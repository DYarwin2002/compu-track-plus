ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  supplier_ruc text,
  doc_type text NOT NULL DEFAULT 'Boleta',
  doc_number text NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  igv numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Efectivo',
  notes text,
  image_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_admin_all ON public.purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY purchases_owner_select ON public.purchases FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY purchases_owner_insert ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY purchases_owner_update ON public.purchases FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY purchases_owner_delete ON public.purchases FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.set_purchase_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_purchase_created_by() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_purchase_created_by ON public.purchases;
CREATE TRIGGER trg_purchase_created_by BEFORE INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_purchase_created_by();

DROP TRIGGER IF EXISTS trg_purchases_updated_at ON public.purchases;
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.warranties DROP CONSTRAINT IF EXISTS warranties_customer_id_fkey;
ALTER TABLE public.warranties ADD CONSTRAINT warranties_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.repairs DROP CONSTRAINT IF EXISTS repairs_customer_id_fkey;
ALTER TABLE public.repairs ADD CONSTRAINT repairs_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
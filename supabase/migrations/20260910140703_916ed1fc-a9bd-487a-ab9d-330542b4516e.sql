CREATE SEQUENCE IF NOT EXISTS public.web_order_number_seq;

CREATE TABLE public.web_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('P' || lpad(nextval('public.web_order_number_seq')::text, 6, '0')),
  track_code text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_document text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  notes text,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.web_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.web_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  size text,
  color text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.web_orders TO authenticated;
GRANT UPDATE, DELETE ON public.web_orders TO authenticated;
GRANT ALL ON public.web_orders TO service_role;
GRANT SELECT, DELETE ON public.web_order_items TO authenticated;
GRANT ALL ON public.web_order_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.web_order_number_seq TO service_role;

ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY web_orders_staff_select ON public.web_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY web_orders_admin_update ON public.web_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY web_orders_admin_delete ON public.web_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY web_order_items_staff_select ON public.web_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY web_order_items_admin_delete ON public.web_order_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_web_orders_created_at ON public.web_orders (created_at DESC);
CREATE INDEX idx_web_order_items_order ON public.web_order_items (order_id);

CREATE TRIGGER trg_web_orders_updated_at BEFORE UPDATE ON public.web_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
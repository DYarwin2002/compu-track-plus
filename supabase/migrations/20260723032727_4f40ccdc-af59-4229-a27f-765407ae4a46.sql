
-- Estado de la orden
DO $$ BEGIN
  CREATE TYPE public.repair_status AS ENUM ('Recibido','Diagnostico','En reparacion','Listo','Entregado','Cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Secuencia para número de orden
CREATE SEQUENCE IF NOT EXISTS public.repairs_order_seq START 1;

CREATE TABLE public.repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  device TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  accessories TEXT,
  reported_issue TEXT NOT NULL,
  diagnosis TEXT,
  internal_notes TEXT,
  technician TEXT,
  cost_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_final NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.repair_status NOT NULL DEFAULT 'Recibido',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repairs TO authenticated;
GRANT ALL ON public.repairs TO service_role;
GRANT USAGE ON SEQUENCE public.repairs_order_seq TO authenticated;
GRANT ALL ON SEQUENCE public.repairs_order_seq TO service_role;

ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Admin ve todo
CREATE POLICY "repairs_admin_all" ON public.repairs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vendedor ve y gestiona lo suyo
CREATE POLICY "repairs_owner_select" ON public.repairs
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "repairs_owner_insert" ON public.repairs
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "repairs_owner_update" ON public.repairs
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "repairs_owner_delete" ON public.repairs
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Trigger: número de orden y created_by
CREATE OR REPLACE FUNCTION public.set_repair_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'OT-' || lpad(nextval('public.repairs_order_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.set_repair_defaults() FROM anon, authenticated;

CREATE TRIGGER trg_set_repair_defaults
  BEFORE INSERT ON public.repairs
  FOR EACH ROW EXECUTE FUNCTION public.set_repair_defaults();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;

CREATE TRIGGER trg_repairs_updated_at
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_repairs_status ON public.repairs(status);
CREATE INDEX idx_repairs_created_by ON public.repairs(created_by);
CREATE INDEX idx_repairs_customer ON public.repairs(customer_id);

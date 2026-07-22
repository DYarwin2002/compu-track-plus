
-- 1. profiles.active
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 2. created_by columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill warranties.created_by from sales.created_by
UPDATE public.warranties w SET created_by = s.created_by
  FROM public.sales s WHERE w.sale_id = s.id AND w.created_by IS NULL;

-- 3. Triggers to auto-populate created_by
CREATE OR REPLACE FUNCTION public.set_created_by_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_created_by_customer() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_customers_created_by ON public.customers;
CREATE TRIGGER trg_customers_created_by BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_customer();

CREATE OR REPLACE FUNCTION public.set_warranty_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    SELECT created_by INTO NEW.created_by FROM public.sales WHERE id = NEW.sale_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_warranty_created_by() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_warranty_created_by ON public.warranties;
CREATE TRIGGER trg_set_warranty_created_by BEFORE INSERT ON public.warranties
  FOR EACH ROW EXECUTE FUNCTION public.set_warranty_created_by();

-- 4. Tighten SELECT policies: vendors see only their own scope
DROP POLICY IF EXISTS customers_staff_select ON public.customers;
CREATE POLICY customers_staff_select ON public.customers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.sales s WHERE s.customer_id = customers.id AND s.created_by = auth.uid())
  );

DROP POLICY IF EXISTS warranties_staff_select ON public.warranties;
CREATE POLICY warranties_staff_select ON public.warranties FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = warranties.sale_id AND s.created_by = auth.uid())
  );

-- 5. Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  meta JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_admin_select ON public.audit_log;
CREATE POLICY audit_admin_select ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS audit_insert_own ON public.audit_log;
CREATE POLICY audit_insert_own ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON public.audit_log (user_id);

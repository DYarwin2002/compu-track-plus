
-- 1) Roles catalog
CREATE TABLE public.roles (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_key_format CHECK (key ~ '^[a-z][a-z0-9_]{1,31}$')
);
GRANT SELECT ON public.roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.roles (key, label, description, is_system, sort_order) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema', true, 1),
  ('vendedor', 'Vendedor', 'Acceso a ventas, clientes y garantías propias', true, 2);

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Protect system roles from delete/rename
CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.is_system THEN RAISE EXCEPTION 'No se puede eliminar un rol del sistema (%).', OLD.key; END IF;
    RETURN OLD;
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.is_system AND NEW.key <> OLD.key THEN
      RAISE EXCEPTION 'No se puede renombrar la clave de un rol del sistema (%).', OLD.key;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_roles_protect BEFORE UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_roles();

-- 2) Drop policies that literally reference app_role
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;

-- 3) Change columns to text
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.role_permissions ADD PRIMARY KEY (role, permission);

-- 4) Drop old has_role and all dependent policies
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- 5) Recreate has_role with text
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;

-- 6) Recreate policies (text literals)

-- audit_log
CREATE POLICY audit_admin_select ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- customers
CREATE POLICY customers_admin_delete ON public.customers FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY customers_staff_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'vendedor') OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY customers_staff_select ON public.customers FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR (created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.sales s WHERE s.customer_id = customers.id AND s.created_by = auth.uid())
  );
CREATE POLICY customers_staff_update ON public.customers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- products
CREATE POLICY products_admin_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY products_admin_update ON public.products FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY products_delete_admin ON public.products FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY products_staff_select ON public.products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- profiles
CREATE POLICY profiles_select_self_or_admin ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

-- repairs
CREATE POLICY repairs_admin_all ON public.repairs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- role_permissions
CREATE POLICY "Admins can delete role permissions" ON public.role_permissions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert role permissions" ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update role permissions" ON public.role_permissions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- sale_items
CREATE POLICY sale_items_admin_delete ON public.sale_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY sale_items_admin_update ON public.sale_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND s.created_by = auth.uid()));
CREATE POLICY sale_items_select ON public.sale_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND (has_role(auth.uid(), 'admin') OR s.created_by = auth.uid())));

-- sales
CREATE POLICY sales_admin_update ON public.sales FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY sales_delete_admin ON public.sales FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY sales_staff_insert ON public.sales FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY sales_staff_select ON public.sales FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- user_roles
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_update ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- warranties
CREATE POLICY warranties_admin_delete ON public.warranties FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY warranties_admin_insert ON public.warranties FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY warranties_admin_update ON public.warranties FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY warranties_staff_select ON public.warranties FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sales s WHERE s.id = warranties.sale_id AND s.created_by = auth.uid())
  );

-- Policies for the new roles table
CREATE POLICY roles_read_authenticated ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_admin_insert ON public.roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY roles_admin_update ON public.roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY roles_admin_delete ON public.roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 7) FKs (ON UPDATE CASCADE / ON DELETE RESTRICT)
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_fkey FOREIGN KEY (role) REFERENCES public.roles(key) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_fkey FOREIGN KEY (role) REFERENCES public.roles(key) ON UPDATE CASCADE ON DELETE CASCADE;

-- 8) Drop obsolete enum type
DROP TYPE IF EXISTS public.app_role;

-- 9) has_permission stays valid (calls has_role(_uuid, 'admin' text))
-- No changes needed to handle_new_user (inserts text literals).

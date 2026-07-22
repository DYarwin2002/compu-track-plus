
-- =========================
-- ROLES
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-crear profile + rol al registrarse. Primer usuario = admin, resto = vendedor.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- CLIENTES
-- =========================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_all_auth" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_customers_document ON public.customers(document);
CREATE INDEX idx_customers_name ON public.customers(full_name);

-- =========================
-- PRODUCTOS
-- =========================
CREATE TYPE public.product_condition AS ENUM ('Nuevo', 'Usado', 'Reacondicionado');

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  category TEXT NOT NULL,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  condition public.product_condition NOT NULL DEFAULT 'Nuevo',
  default_warranty_months INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_products_serial ON public.products(serial_number);
CREATE INDEX idx_products_model ON public.products(model);

-- =========================
-- VENTAS
-- =========================
CREATE TYPE public.payment_method AS ENUM ('Efectivo', 'Yape', 'Transferencia', 'Tarjeta');
CREATE TYPE public.warranty_status AS ENUM ('Activa', 'Próxima a vencer', 'Vencida', 'Anulada');

CREATE SEQUENCE public.sale_number_seq START 1;

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT NOT NULL UNIQUE DEFAULT ('B' || LPAD(nextval('public.sale_number_seq')::TEXT, 6, '0')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  igv NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'Efectivo',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
GRANT USAGE ON SEQUENCE public.sale_number_seq TO authenticated;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sales_delete_admin" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  serial_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  warranty_months INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_all" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_serial ON public.sale_items(serial_number);

-- Descontar stock automáticamente
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
      SET stock = GREATEST(stock - NEW.quantity, 0),
          updated_at = now()
      WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();

-- =========================
-- GARANTÍAS
-- =========================
CREATE TABLE public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  serial_number TEXT,
  sale_date TIMESTAMPTZ NOT NULL,
  duration_months INTEGER NOT NULL,
  expires_at DATE NOT NULL,
  status public.warranty_status NOT NULL DEFAULT 'Activa',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranties TO authenticated;
GRANT SELECT ON public.warranties TO anon;
GRANT ALL ON public.warranties TO service_role;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warranties_public_select" ON public.warranties FOR SELECT TO anon USING (true);
CREATE POLICY "warranties_auth_all" ON public.warranties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_warranties_serial ON public.warranties(serial_number);
CREATE INDEX idx_warranties_sale ON public.warranties(sale_id);
CREATE INDEX idx_warranties_expires ON public.warranties(expires_at);

-- Auto-generar garantía al insertar cada sale_item
CREATE OR REPLACE FUNCTION public.create_warranty_from_sale_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  i INTEGER;
BEGIN
  SELECT sale_date, customer_id INTO s FROM public.sales WHERE id = NEW.sale_id;
  -- Una garantía por unidad vendida (típicamente qty 1 para equipos)
  FOR i IN 1..NEW.quantity LOOP
    INSERT INTO public.warranties (
      sale_id, sale_item_id, customer_id, product_name, serial_number,
      sale_date, duration_months, expires_at, status
    ) VALUES (
      NEW.sale_id, NEW.id, s.customer_id, NEW.product_name, NEW.serial_number,
      s.sale_date, NEW.warranty_months,
      (s.sale_date + (NEW.warranty_months || ' months')::INTERVAL)::DATE,
      'Activa'
    );
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_create_warranty
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.create_warranty_from_sale_item();

-- Función para refrescar estados de garantía (llamada al listar)
CREATE OR REPLACE FUNCTION public.refresh_warranty_statuses()
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.warranties SET status = 'Vencida', updated_at = now()
    WHERE status IN ('Activa','Próxima a vencer') AND expires_at < CURRENT_DATE;
  UPDATE public.warranties SET status = 'Próxima a vencer', updated_at = now()
    WHERE status = 'Activa' AND expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';
$$;
GRANT EXECUTE ON FUNCTION public.refresh_warranty_statuses() TO authenticated, anon;

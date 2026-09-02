DROP TRIGGER IF EXISTS trg_create_warranty ON public.sale_items;
DROP TRIGGER IF EXISTS trg_set_warranty_created_by ON public.warranties;
DROP TRIGGER IF EXISTS trg_set_repair_defaults ON public.repairs;
DROP TRIGGER IF EXISTS trg_repairs_updated_at ON public.repairs;
DROP TABLE IF EXISTS public.warranties CASCADE;
DROP TABLE IF EXISTS public.repairs CASCADE;
DROP FUNCTION IF EXISTS public.create_warranty_from_sale_item() CASCADE;
DROP FUNCTION IF EXISTS public.set_warranty_created_by() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_warranty_statuses() CASCADE;
DROP FUNCTION IF EXISTS public.set_repair_defaults() CASCADE;
DROP SEQUENCE IF EXISTS public.repairs_order_seq CASCADE;
DROP TYPE IF EXISTS public.warranty_status CASCADE;
DROP TYPE IF EXISTS public.repair_status CASCADE;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'Entregado';

DELETE FROM public.role_permissions WHERE permission LIKE 'warranties.%' OR permission LIKE 'repairs.%';
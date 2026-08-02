-- Garantía fija de 12 meses contada desde la fecha de venta
ALTER TABLE public.products ALTER COLUMN default_warranty_months SET DEFAULT 12;
ALTER TABLE public.sale_items ALTER COLUMN warranty_months SET DEFAULT 12;

CREATE OR REPLACE FUNCTION public.create_warranty_from_sale_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  i INTEGER;
BEGIN
  SELECT sale_date, customer_id INTO s FROM public.sales WHERE id = NEW.sale_id;
  FOR i IN 1..NEW.quantity LOOP
    INSERT INTO public.warranties (
      sale_id, sale_item_id, customer_id, product_name, serial_number,
      sale_date, duration_months, expires_at, status
    ) VALUES (
      NEW.sale_id, NEW.id, s.customer_id, NEW.product_name, NEW.serial_number,
      s.sale_date, 12,
      (s.sale_date + INTERVAL '12 months')::DATE,
      'Activa'
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

UPDATE public.warranties
  SET duration_months = 12,
      expires_at = (sale_date + INTERVAL '12 months')::DATE,
      updated_at = now()
  WHERE status <> 'Anulada';

SELECT public.refresh_warranty_statuses();
ALTER TABLE public.modifier_options
  ADD COLUMN slug text;

UPDATE public.modifier_options
SET slug = CASE name
  WHEN 'Queijo extra' THEN 'queijo'
  WHEN 'Carne extra' THEN 'carne'
  WHEN 'Molho cheddar' THEN 'molho-cheddar'
  WHEN 'Molho barbecue' THEN 'barbecue'
  WHEN 'Maionese temperada' THEN 'maionese-temperada'
  WHEN 'Ketchup' THEN 'ketchup'
  ELSE NULL
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.modifier_options WHERE slug IS NULL
  ) THEN
    RAISE EXCEPTION 'Existe uma opção sem identificador cadastrado.';
  END IF;
END $$;

ALTER TABLE public.modifier_options
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT modifier_options_slug_unique UNIQUE (slug),
  ADD CONSTRAINT modifier_options_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

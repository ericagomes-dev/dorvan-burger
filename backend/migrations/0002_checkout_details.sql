ALTER TABLE public.orders
  ADD COLUMN delivery_reference text,
  ADD COLUMN payment_method text
    CHECK (payment_method IN ('pix', 'credito', 'debito', 'dinheiro')),
  ADD COLUMN cash_change_for_cents integer
    CHECK (cash_change_for_cents IS NULL OR cash_change_for_cents >= 0);

ALTER TABLE public.order_items
  ADD COLUMN removed_ingredients text[] NOT NULL DEFAULT '{}',
  ADD COLUMN item_note text NOT NULL DEFAULT ''
    CHECK (length(item_note) <= 180);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_reference_length_check
    CHECK (delivery_reference IS NULL OR length(delivery_reference) <= 180);

-- Single-store baseline: deploy this schema into one dedicated database per
-- customer installation. The filename is retained so the migration checksum
-- guard detects the earlier, unapplied multi-tenant draft with this same ID.
CREATE TABLE public.store_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  slug text NOT NULL UNIQUE CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  storefront_enabled boolean NOT NULL DEFAULT false,
  currency char(3) NOT NULL DEFAULT 'BRL' CHECK (currency ~ '^[A-Z]{3}$'),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Authentication is added separately. This table is local to this installation;
-- credentials remain with the chosen identity provider.
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY,
  identity_subject text NOT NULL UNIQUE CHECK (length(identity_subject) BETWEEN 1 AND 255),
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX categories_active_sort_idx ON public.categories (active, sort_order);

CREATE TABLE public.products (
  id uuid PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  image_key text,
  active boolean NOT NULL DEFAULT true,
  customizable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_active_idx ON public.products (category_id, active);

CREATE TABLE public.modifier_groups (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  min_select integer NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select integer NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.modifier_options (
  id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  price_delta_cents integer NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX modifier_options_group_active_idx ON public.modifier_options (group_id, active);

CREATE TABLE public.product_modifier_groups (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id)
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY,
  public_order_number text NOT NULL UNIQUE CHECK (length(btrim(public_order_number)) BETWEEN 1 AND 40),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 16 AND 128),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('delivery', 'pickup')),
  customer_name text,
  customer_phone text,
  delivery_address text,
  customer_notes text,
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents = subtotal_cents + delivery_fee_cents),
  currency char(3) NOT NULL DEFAULT 'BRL' CHECK (currency ~ '^[A-Z]{3}$'),
  payment_status text NOT NULL DEFAULT 'not_charged' CHECK (payment_status = 'not_charged'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fulfillment_type = 'delivery' OR delivery_fee_cents = 0)
);
CREATE INDEX orders_status_created_idx ON public.orders (status, created_at DESC);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL CHECK (length(btrim(product_name_snapshot)) BETWEEN 1 AND 120),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_cents integer NOT NULL CHECK (line_total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items (order_id);

CREATE TABLE public.order_item_options (
  id uuid PRIMARY KEY,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  modifier_option_id uuid NOT NULL REFERENCES public.modifier_options(id) ON DELETE RESTRICT,
  option_name_snapshot text NOT NULL CHECK (length(btrim(option_name_snapshot)) BETWEEN 1 AND 100),
  price_delta_cents integer NOT NULL CHECK (price_delta_cents >= 0)
);
CREATE INDEX order_item_options_item_idx ON public.order_item_options (order_item_id);

CREATE TABLE public.order_status_events (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  from_status text CHECK (from_status IS NULL OR from_status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  to_status text NOT NULL CHECK (to_status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  actor_user_id uuid REFERENCES public.admin_users(id) ON DELETE RESTRICT,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_events_order_idx ON public.order_status_events (order_id, changed_at);

-- Dorvan is the base installation. Each customer receives a separate database
-- and seeds its own store_settings row and menu.
INSERT INTO public.store_settings
  (id, slug, name, status, storefront_enabled, currency, timezone, delivery_fee_cents)
VALUES
  (1, 'dorvan-burger', 'Dorvan Burger', 'active', true, 'BRL', 'America/Sao_Paulo', 800);

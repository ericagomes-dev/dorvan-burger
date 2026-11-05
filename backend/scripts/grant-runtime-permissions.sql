-- Run as the migration owner after db:migrate. The runtime role is for this
-- installation only; it must not own tables or have elevated role attributes.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO dorvan_app;

-- Storefront configuration is readable by the application. Only editable
-- configuration columns are granted; the singleton row is created by migration.
GRANT SELECT ON public.store_settings TO dorvan_app;
GRANT UPDATE (slug, name, status, storefront_enabled, currency, timezone, delivery_fee_cents, updated_at)
  ON public.store_settings TO dorvan_app;

-- Catalog and customization use soft-disable flags rather than hard deletes.
GRANT SELECT, INSERT, UPDATE ON public.categories TO dorvan_app;
GRANT SELECT, INSERT, UPDATE ON public.products TO dorvan_app;
GRANT SELECT, INSERT, UPDATE ON public.modifier_groups TO dorvan_app;
GRANT SELECT, INSERT, UPDATE ON public.modifier_options TO dorvan_app;
GRANT SELECT, INSERT, UPDATE ON public.product_modifier_groups TO dorvan_app;

-- Orders are append/transition records; customer fields cannot be rewritten by
-- the runtime role after creation.
GRANT SELECT, INSERT ON public.orders TO dorvan_app;
GRANT UPDATE (status, updated_at) ON public.orders TO dorvan_app;
GRANT SELECT, INSERT ON public.order_items TO dorvan_app;
GRANT SELECT, INSERT ON public.order_item_options TO dorvan_app;
GRANT SELECT, INSERT ON public.order_status_events TO dorvan_app;

-- Authentication is not part of this phase. Keep admin identities and migration
-- metadata inaccessible until their respective backend paths are implemented.
REVOKE ALL PRIVILEGES ON public.admin_users FROM dorvan_app;
REVOKE ALL PRIVILEGES ON public.schema_migrations FROM dorvan_app;

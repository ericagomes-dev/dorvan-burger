# Single-store backend foundation

The repository is the Dorvan Burger base template. Each customer deployment
must run its own application installation and its own PostgreSQL database.
Never point two customers at the same database or treat a domain, request field,
or browser value as a tenant selector. There is no shared tenant directory or
central admin panel in this model.

The existing Dorvan storefront, visual identity, menu, cart, and demo checkout
remain the base experience. Store-specific domain, branding, menu, prices,
delivery settings, and Mercado Pago secrets belong to that customer's separate
installation. Keep credentials on the server; do not place secrets in `VITE_*`
variables or source control.

## Roles and database provisioning

Use a database administrator only to provision each new installation. Create
two separate login roles; set passwords interactively with `psql`'s `\password`
command or through a secret manager. The migration role owns the new database;
the runtime role must not own schema objects or inherit privileges from other
roles.

```sql
CREATE ROLE dorvan_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE dorvan_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE DATABASE dorvan_customer_db OWNER dorvan_migrator;
GRANT CONNECT ON DATABASE dorvan_customer_db TO dorvan_app;
```

Replace `dorvan_customer_db` with a new database name. The only database used
for this phase's integration test is `dorvan_phase1_test`. Check that it does
not already exist before creating it. Keep an independent backup before any
structural change to a database that contains data; verify the backup by
restoring it to a different database.

Configure `DATABASE_MIGRATION_URL` with the migration role and
`DATABASE_URL` with `dorvan_app`. Production connections must set
`DATABASE_SSL=require`, which enables certificate verification.

## Apply the single-store baseline

The baseline migration seeds Dorvan as the single store in its installation and
sets `delivery_fee_cents` to 800. Run it only against a new database dedicated
to that customer:

```powershell
cd backend
npm install
npm run db:migrate
psql $env:DATABASE_MIGRATION_URL -f scripts/grant-runtime-permissions.sql
```

The migration runner takes an advisory lock, applies each numbered SQL file in
a transaction, and records a SHA-256 checksum. The `0001_tenant_core.sql`
filename is retained to make the checksum guard reject databases that applied
the earlier multi-tenant draft under that ID. Do not edit an already-applied
migration or point this revised baseline at such a database; use a separately
reviewed, data-preserving migration instead.

## Schema and access model

Each database has one `store_settings` row, local admin identities, categories,
products, modifiers, orders, items, and order-status history. Foreign keys use
ordinary single-database keys. There are no `establishment_id` columns,
memberships, tenant context settings, or cross-store RLS policies. Isolation
between customers comes from separate application deployments, databases,
credentials, and backups.

The runtime grants cannot delete or truncate records, cannot access
`admin_users` or migration metadata, and can update only order status fields.
Authentication and account recovery are not implemented in this phase. The
identity table does not store passwords. Real Mercado Pago processing is not
implemented; `PAYMENTS_MODE=demo` remains the default and orders remain
`not_charged`.

## Tests

Run the backend unit suite:

```powershell
cd backend
npm test
```

The PostgreSQL integration test is opt-in. Set `TEST_DATABASE_URL` to the local
`dorvan_phase1_test` database, using the `dorvan_app` role, then run `npm test`.
It inserts temporary catalog and order records in one transaction and rolls
them all back. It checks the single-store schema, relational constraints, the
R$ 8,00 Dorvan setting, and runtime privileges. It does not create or delete a
database, and it refuses non-loopback hosts or any other database name.

Take backups per installation and test restoration before upgrades. Prefer a
reviewed forward migration over dropping tables or rebuilding a database that
already contains orders or customer data.

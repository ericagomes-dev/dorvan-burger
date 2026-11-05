ALTER TABLE public.products
  ADD COLUMN ingredients text[] NOT NULL DEFAULT '{}';

INSERT INTO public.categories (id, slug, name, sort_order)
VALUES
  (gen_random_uuid(), 'hamburgueres', 'Hambúrgueres', 1),
  (gen_random_uuid(), 'combos', 'Combos', 2),
  (gen_random_uuid(), 'acompanhamentos', 'Acompanhamentos', 3),
  (gen_random_uuid(), 'bebidas', 'Bebidas', 4),
  (gen_random_uuid(), 'adicionais', 'Adicionais', 5);

WITH seed(slug, name, description, price_cents, category_slug, image_key, customizable, ingredients) AS (
  VALUES
  ('classico-double', 'Clássico Double', 'Burger 160 g, queijo prato, alface, tomate e maionese da casa.', 3290, 'hamburgueres', 'hamburguer-classico.png', true, ARRAY['Queijo prato','Alface','Tomate','Maionese Dorvan']::text[]),
  ('smash-cheddar', 'Smash Cheddar', 'Smash 160 g, cheddar, bacon, cebola tostada e molho especial.', 3590, 'hamburgueres', 'smash-cheddar-bacon.png', true, ARRAY['Cheddar','Bacon','Cebola tostada','Molho especial']::text[]),
  ('duplo-da-casa', 'Duplo da Casa', 'Dois burgers na chapa, cheddar derretido e cebola caramelizada.', 4290, 'hamburgueres', 'hamburguer-duplo-casa.png', true, ARRAY['Cheddar','Cebola caramelizada']::text[]),
  ('combo-individual', 'Combo Individual', 'Um hambúrguer, batata tradicional e um refrigerante.', 4790, 'combos', 'combo-individual.png', true, ARRAY[]::text[]),
  ('combo-duplo', 'Combo Duplo', 'Dois hambúrgueres com acompanhamentos e bebidas.', 9990, 'combos', 'combo-duplo.png', true, ARRAY[]::text[]),
  ('combo-familia', 'Combo Família', 'Quatro hambúrgueres, fritas para compartilhar e quatro bebidas.', 16990, 'combos', 'combo-familia.png', true, ARRAY[]::text[]),
  ('combo-kids', 'Combo Kids', 'Hambúrguer infantil, batata frita tradicional e suco de laranja.', 2990, 'combos', 'combo-kids.png', true, ARRAY[]::text[]),
  ('fritas-tradicionais', 'Batata frita tradicional', 'Porção individual de batatas douradas com sal.', 1490, 'acompanhamentos', 'batata-tradicional.png', false, ARRAY[]::text[]),
  ('fritas-cheddar-bacon', 'Batata com cheddar e bacon', 'Batata crocante com cheddar cremoso e bacon em cubos.', 2290, 'acompanhamentos', 'batata-cheddar-bacon.png', false, ARRAY[]::text[]),
  ('onion-rings', 'Anéis de cebola', 'Porção crocante, empanada na hora.', 1990, 'acompanhamentos', 'aneis-de-cebola.png', false, ARRAY[]::text[]),
  ('coca-cola-lata', 'Coca-Cola lata 350 ml', 'Lata individual de 350 ml.', 700, 'bebidas', 'coca-cola-lata.png', false, ARRAY[]::text[]),
  ('coca-zero-lata', 'Coca-Cola Zero lata 350 ml', 'Lata individual de 350 ml.', 700, 'bebidas', 'coca-cola-zero-lata.png', false, ARRAY[]::text[]),
  ('fanta-laranja-lata', 'Fanta Laranja lata 350 ml', 'Lata individual de 350 ml.', 700, 'bebidas', 'fanta-laranja-lata.png', false, ARRAY[]::text[]),
  ('sprite-lata', 'Sprite lata 350 ml', 'Lata individual de 350 ml.', 700, 'bebidas', 'sprite-lata.png', false, ARRAY[]::text[]),
  ('guarana-lata', 'Guaraná Antarctica lata 350 ml', 'Lata individual de 350 ml.', 700, 'bebidas', 'guarana-lata.png', false, ARRAY[]::text[]),
  ('coca-2l', 'Coca-Cola 2 litros', 'Garrafa de 2 litros.', 1200, 'bebidas', 'coca-cola-2l.png', false, ARRAY[]::text[]),
  ('guarana-2l', 'Guaraná Antarctica 2 litros', 'Garrafa de 2 litros.', 1200, 'bebidas', 'guarana-2l.png', false, ARRAY[]::text[]),
  ('agua', 'Água mineral individual', 'Garrafa individual de água mineral.', 500, 'bebidas', 'agua-mineral.png', false, ARRAY[]::text[]),
  ('suco-laranja', 'Suco natural de laranja', 'Suco natural de laranja.', 1000, 'bebidas', 'suco-laranja.png', false, ARRAY[]::text[]),
  ('milkshake-morango', 'Milk-shake de morango', 'Cremoso, preparado com calda de morango.', 1990, 'bebidas', 'milkshake-morango.png', false, ARRAY[]::text[]),
  ('milkshake-chocolate', 'Milk-shake de chocolate', 'Cremoso, com calda de chocolate.', 1990, 'bebidas', 'milkshake-chocolate.png', false, ARRAY[]::text[]),
  ('extra-queijo', 'Queijo extra', 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.', 400, 'adicionais', 'queijo-extra.png', false, ARRAY[]::text[]),
  ('extra-carne', 'Carne extra', 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.', 800, 'adicionais', 'carne-extra.png', false, ARRAY[]::text[]),
  ('extra-molho-cheddar', 'Molho cheddar', 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.', 250, 'adicionais', 'molho-cheddar.png', false, ARRAY[]::text[]),
  ('extra-barbecue', 'Molho barbecue', 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.', 200, 'adicionais', 'molho-barbecue.png', false, ARRAY[]::text[]),
  ('extra-maionese-temperada', 'Maionese temperada', 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.', 200, 'adicionais', 'maionese-temperada.png', false, ARRAY[]::text[]),
  ('extra-ketchup', 'Ketchup', 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.', 100, 'adicionais', 'ketchup.png', false, ARRAY[]::text[])
)
INSERT INTO public.products
  (id, category_id, slug, name, description, price_cents, image_key, customizable, ingredients)
SELECT gen_random_uuid(), c.id, s.slug, s.name, s.description, s.price_cents, s.image_key, s.customizable, s.ingredients
FROM seed s
JOIN public.categories c ON c.slug = s.category_slug;

INSERT INTO public.modifier_groups (id, name, min_select, max_select)
VALUES
  (gen_random_uuid(), 'Extras', 0, 6),
  (gen_random_uuid(), 'Molhos', 0, 6);

INSERT INTO public.modifier_options (id, group_id, name, price_delta_cents)
SELECT gen_random_uuid(), g.id, v.name, v.price
FROM (VALUES
  ('Extras', 'Queijo extra', 400),
  ('Extras', 'Carne extra', 800),
  ('Molhos', 'Molho cheddar', 250),
  ('Molhos', 'Molho barbecue', 200),
  ('Molhos', 'Maionese temperada', 200),
  ('Molhos', 'Ketchup', 100)
) AS v(group_name, name, price)
JOIN public.modifier_groups g ON g.name = v.group_name;

INSERT INTO public.product_modifier_groups (product_id, group_id, sort_order)
SELECT p.id, g.id, CASE g.name WHEN 'Extras' THEN 1 ELSE 2 END
FROM public.products p
CROSS JOIN public.modifier_groups g
WHERE p.customizable = true;

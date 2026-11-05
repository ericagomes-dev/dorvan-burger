export type Category = 'Todos' | 'Hambúrgueres' | 'Combos' | 'Acompanhamentos' | 'Bebidas' | 'Adicionais'
export type MenuCategory = Exclude<Category, 'Todos'>

export type MenuProduct = {
  id: string
  name: string
  description: string
  priceCents: number
  category: MenuCategory
  image?: string
  badge?: string
  ingredients: string[]
  customizable?: boolean
}

export type AddOn = { id: string; name: string; priceCents: number; group: 'Extra' | 'Molho'; image?: string }
export type CartLine = { key: string; productId: string; quantity: number; addOnIds: string[]; removedIngredients: string[]; note: string }

const image = (filename: string) => `/images/${encodeURIComponent(filename)}`

export const images = {
  logo: image('logo-dorvan-burger.png'),
  hero: image('hamburguer-classico.png'),
  interior: image('ambiente-restaurante.png'),
  classic: image('hamburguer-classico.png'),
  smash: image('smash-cheddar-bacon.png'),
  burgerDouble: image('hamburguer-duplo-casa.png'),
  comboSolo: image('combo-individual.png'),
  comboDouble: image('combo-duplo.png'),
  comboFamily: image('combo-familia.png'),
  comboKids: image('combo-kids.png'),
  fries: image('batata-tradicional.png'),
  loadedFries: image('batata-cheddar-bacon.png'),
  onionRings: image('aneis-de-cebola.png'),
  sodaGroup: image('refrigerantes-sortidos.png'),
  coke2l: image('coca-cola-2l.png'),
  cokeCan: image('coca-cola-lata.png'),
  cokeZeroCan: image('coca-cola-zero-lata.png'),
  guaranaCan: image('guarana-lata.png'),
  guarana2l: image('guarana-2l.png'),
  sprite: image('sprite-lata.png'),
  fanta: image('fanta-laranja-lata.png'),
  water: image('agua-mineral.png'),
  juice: image('suco-laranja.png'),
  strawberryShake: image('milkshake-morango.png'),
  chocolateShake: image('milkshake-chocolate.png'),
  extraMeat: image('carne-extra.png'),
}

export const categories: Category[] = ['Todos', 'Hambúrgueres', 'Combos', 'Acompanhamentos', 'Bebidas', 'Adicionais']

const baseProducts: MenuProduct[] = [
  { id: 'classico-double', name: 'Clássico Double', description: 'Burger 160 g, queijo prato, alface, tomate e maionese da casa.', priceCents: 3290, category: 'Hambúrgueres', image: images.classic, badge: 'O ORIGINAL', ingredients: ['Queijo prato', 'Alface', 'Tomate', 'Maionese Dorvan'], customizable: true },
  { id: 'smash-cheddar', name: 'Smash Cheddar', description: 'Smash 160 g, cheddar, bacon, cebola tostada e molho especial.', priceCents: 3590, category: 'Hambúrgueres', image: images.smash, ingredients: ['Cheddar', 'Bacon', 'Cebola tostada', 'Molho especial'], customizable: true },
  { id: 'duplo-da-casa', name: 'Duplo da Casa', description: 'Dois burgers na chapa, cheddar derretido e cebola caramelizada.', priceCents: 4290, category: 'Hambúrgueres', image: images.burgerDouble, badge: 'FOME GRANDE', ingredients: ['Cheddar', 'Cebola caramelizada'], customizable: true },
  { id: 'combo-individual', name: 'Combo Individual', description: 'Um hambúrguer, batata tradicional e um refrigerante.', priceCents: 4790, category: 'Combos', image: images.comboSolo, ingredients: [], customizable: true },
  { id: 'combo-duplo', name: 'Combo Duplo', description: 'Dois hambúrgueres com acompanhamentos e bebidas.', priceCents: 9990, category: 'Combos', image: images.comboDouble, ingredients: [], customizable: true },
  { id: 'combo-familia', name: 'Combo Família', description: 'Quatro hambúrgueres, fritas para compartilhar e quatro bebidas.', priceCents: 16990, category: 'Combos', image: images.comboFamily, badge: 'PRA COMPARTILHAR', ingredients: [], customizable: true },
  { id: 'combo-kids', name: 'Combo Kids', description: 'Hambúrguer infantil, batata frita tradicional e suco de laranja.', priceCents: 2990, category: 'Combos', image: images.comboKids, ingredients: [], customizable: true },
  { id: 'fritas-tradicionais', name: 'Batata frita tradicional', description: 'Porção individual de batatas douradas com sal.', priceCents: 1490, category: 'Acompanhamentos', image: images.fries, ingredients: [] },
  { id: 'fritas-cheddar-bacon', name: 'Batata com cheddar e bacon', description: 'Batata crocante com cheddar cremoso e bacon em cubos.', priceCents: 2290, category: 'Acompanhamentos', image: images.loadedFries, ingredients: [] },
  { id: 'onion-rings', name: 'Anéis de cebola', description: 'Porção crocante, empanada na hora.', priceCents: 1990, category: 'Acompanhamentos', image: images.onionRings, ingredients: [] },
  { id: 'coca-cola-lata', name: 'Coca-Cola lata 350 ml', description: 'Lata individual de 350 ml.', priceCents: 700, category: 'Bebidas', image: images.cokeCan, ingredients: [] },
  { id: 'coca-zero-lata', name: 'Coca-Cola Zero lata 350 ml', description: 'Lata individual de 350 ml.', priceCents: 700, category: 'Bebidas', image: images.cokeZeroCan, ingredients: [] },
  { id: 'fanta-laranja-lata', name: 'Fanta Laranja lata 350 ml', description: 'Lata individual de 350 ml.', priceCents: 700, category: 'Bebidas', image: images.fanta, ingredients: [] },
  { id: 'sprite-lata', name: 'Sprite lata 350 ml', description: 'Lata individual de 350 ml.', priceCents: 700, category: 'Bebidas', image: images.sprite, ingredients: [] },
  { id: 'guarana-lata', name: 'Guaraná Antarctica lata 350 ml', description: 'Lata individual de 350 ml.', priceCents: 700, category: 'Bebidas', image: images.guaranaCan, ingredients: [] },
  { id: 'coca-2l', name: 'Coca-Cola 2 litros', description: 'Garrafa de 2 litros.', priceCents: 1200, category: 'Bebidas', image: images.coke2l, ingredients: [] },
  { id: 'guarana-2l', name: 'Guaraná Antarctica 2 litros', description: 'Garrafa de 2 litros.', priceCents: 1200, category: 'Bebidas', image: images.guarana2l, ingredients: [] },
  { id: 'agua', name: 'Água mineral individual', description: 'Garrafa individual de água mineral.', priceCents: 500, category: 'Bebidas', image: images.water, ingredients: [] },
  { id: 'suco-laranja', name: 'Suco natural de laranja', description: 'Suco natural de laranja.', priceCents: 1000, category: 'Bebidas', image: images.juice, ingredients: [] },
  { id: 'milkshake-morango', name: 'Milk-shake de morango', description: 'Cremoso, preparado com calda de morango.', priceCents: 1990, category: 'Bebidas', image: images.strawberryShake, ingredients: [] },
  { id: 'milkshake-chocolate', name: 'Milk-shake de chocolate', description: 'Cremoso, com calda de chocolate.', priceCents: 1990, category: 'Bebidas', image: images.chocolateShake, ingredients: [] },
]

export const addOns: AddOn[] = [
  { id: 'queijo', name: 'Queijo extra', priceCents: 400, group: 'Extra', image: image('queijo-extra.png') },
  { id: 'carne', name: 'Carne extra', priceCents: 800, group: 'Extra', image: images.extraMeat },
  { id: 'molho-cheddar', name: 'Molho cheddar', priceCents: 250, group: 'Molho', image: image('molho-cheddar.png') },
  { id: 'barbecue', name: 'Molho barbecue', priceCents: 200, group: 'Molho', image: image('molho-barbecue.png') },
  { id: 'maionese-temperada', name: 'Maionese temperada', priceCents: 200, group: 'Molho', image: image('maionese-temperada.png') },
  { id: 'ketchup', name: 'Ketchup', priceCents: 100, group: 'Molho', image: image('ketchup.png') },
]

export const products: MenuProduct[] = [...baseProducts, ...addOns.map((item) => ({
  id: `extra-${item.id}`,
  name: item.name,
  description: 'Adicional demonstrativo para acompanhar ou personalizar seu pedido.',
  priceCents: item.priceCents,
  category: 'Adicionais' as const,
  image: item.image,
  ingredients: [],
}))]

export const DELIVERY_FEE_CENTS = 800
export const formatPrice = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

import type { MenuProduct } from './menu'

const imageCopy: Record<string, { alt: string; fallback: string }> = {
  'classico-double': { alt: 'Hambúrguer clássico Dorvan com queijo prato, alface e tomate', fallback: 'Queijo prato, alface e tomate no pão tostado.' },
  'smash-cheddar': { alt: 'Smash burger Dorvan com cheddar derretido e bacon', fallback: 'Carne na chapa com cheddar, bacon e cebola tostada.' },
  'duplo-da-casa': { alt: 'Hambúrguer duplo Dorvan com cheddar e cebola caramelizada', fallback: 'Dois hambúrgueres com cheddar e cebola caramelizada.' },
  'combo-individual': { alt: 'Combo individual Dorvan com hambúrguer, fritas e refrigerante', fallback: 'Hambúrguer acompanhado de fritas e refrigerante.' },
  'combo-duplo': { alt: 'Combo duplo Dorvan com hambúrgueres, fritas e Coca-Cola', fallback: 'Hambúrgueres, fritas e bebidas para compartilhar.' },
  'combo-familia': { alt: 'Combo família Dorvan Burger com hambúrgueres, fritas e bebidas', fallback: 'Combinação para compartilhar com hambúrgueres e fritas.' },
  'combo-kids': { alt: 'Combo Kids Dorvan com hambúrguer, fritas e suco', fallback: 'Hambúrguer infantil, fritas e suco de laranja.' },
  'fritas-tradicionais': { alt: 'Batata frita tradicional dourada com sal', fallback: 'Batatas douradas temperadas com sal.' },
  'fritas-cheddar-bacon': { alt: 'Batata frita com cheddar cremoso e bacon em cubos', fallback: 'Fritas cobertas com cheddar e bacon.' },
  'onion-rings': { alt: 'Anéis de cebola empanados e dourados Dorvan', fallback: 'Porção crocante de anéis de cebola.' },
  'coca-cola-lata': { alt: 'Lata de Coca-Cola gelada de 350 ml', fallback: 'Coca-Cola em lata individual.' },
  'coca-zero-lata': { alt: 'Lata de Coca-Cola Zero gelada de 350 ml', fallback: 'Coca-Cola Zero em lata individual.' },
  'fanta-laranja-lata': { alt: 'Lata de Fanta Laranja gelada de 350 ml', fallback: 'Fanta Laranja em lata individual.' },
  'sprite-lata': { alt: 'Lata de Sprite gelada de 350 ml com limão', fallback: 'Sprite em lata individual.' },
  'guarana-lata': { alt: 'Lata de Guaraná Antarctica gelada de 350 ml', fallback: 'Guaraná Antarctica em lata individual.' },
  'coca-2l': { alt: 'Garrafa de Coca-Cola de 2 litros gelada', fallback: 'Garrafa de Coca-Cola para compartilhar.' },
  'guarana-2l': { alt: 'Garrafa de Guaraná Antarctica de 2 litros gelada', fallback: 'Garrafa de Guaraná Antarctica para compartilhar.' },
  agua: { alt: 'Garrafa individual de água mineral', fallback: 'Água mineral individual.' },
  'suco-laranja': { alt: 'Copo de suco natural de laranja', fallback: 'Suco natural preparado com laranja.' },
  'milkshake-morango': { alt: 'Milk-shake de morango cremoso Dorvan', fallback: 'Milk-shake cremoso com calda de morango.' },
  'milkshake-chocolate': { alt: 'Milk-shake de chocolate cremoso Dorvan', fallback: 'Milk-shake cremoso com calda de chocolate.' },
  'extra-queijo': { alt: 'Queijo cheddar derretido para adicionar ao hambúrguer', fallback: 'Porção de queijo extra para o seu pedido.' },
  'extra-carne': { alt: 'Carne bovina grelhada para adicionar ao hambúrguer', fallback: 'Porção de carne extra preparada na chapa.' },
  'extra-molho-cheddar': { alt: 'Molho cheddar cremoso servido em uma tigela', fallback: 'Molho cheddar para acompanhar ou personalizar.' },
  'extra-barbecue': { alt: 'Molho barbecue escuro servido em uma tigela', fallback: 'Molho barbecue para acompanhar ou personalizar.' },
  'extra-maionese-temperada': { alt: 'Maionese temperada cremosa servida em uma tigela', fallback: 'Maionese temperada para acompanhar o pedido.' },
  'extra-ketchup': { alt: 'Ketchup servido em uma tigela com tomates ao lado', fallback: 'Ketchup para acompanhar ou personalizar.' },
}

export function productImageAlt(product: MenuProduct): string {
  return imageCopy[product.id]?.alt ?? `${product.name}: ${product.description}`
}

export function productImageFallbackDescription(product: MenuProduct): string {
  return imageCopy[product.id]?.fallback ?? product.description
}

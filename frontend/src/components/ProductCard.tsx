
import type { MenuProduct } from '../data/menu'
import { formatPrice } from '../data/menu'
import { productImageAlt, productImageFallbackDescription } from '../data/productImageCopy'
import { SafeImage } from './SafeImage'
import { ProductImageFallback } from './ProductImageFallback'

type Props = {
  product: MenuProduct
  onAdd: (product: MenuProduct) => void
}

function placeholderMark(category: MenuProduct['category']) {
  if (category === 'Bebidas') return '◉'
  if (category === 'Combos') return '□'
  return '✳'
}

export function ProductCard({ product, onAdd }: Props) {
  const mark = placeholderMark(product.category)
  const photoClass = 'product-photo'

  return (
    <article className="product-card">
      <div
        className={`${product.image ? 'product-image' : `product-image product-placeholder ${product.category.toLowerCase().replaceAll(' ', '-')}`} ${product.category === 'Bebidas' || product.category === 'Adicionais' ? 'product-image-contained' : ''}`}
      >
        {product.image ? (
          <SafeImage
            className={photoClass}
            fallbackClassName="product-image-fallback"
            fallback={
              <ProductImageFallback
                name={product.name}
                description={productImageFallbackDescription(product)}
                mark={mark}
              />
            }
            src={product.image}
            alt={productImageAlt(product)}
            loading="lazy"
          />
        ) : (
          <span className="placeholder-mark" aria-hidden="true">
            {mark}
          </span>
        )}

        {product.badge && (
          <span className="product-badge">{product.badge}</span>
        )}
      </div>

      <div className="product-info">
        <div className="product-meta">
          <span className="product-category">{product.category}</span>
          <span className="product-price">
            {formatPrice(product.priceCents)}
          </span>
        </div>

        <h3>{product.name}</h3>
        <p>{product.description}</p>

        <button
          className="add-product"
          type="button"
          onClick={() => onAdd(product)}
          aria-label={
            product.customizable
              ? `Personalizar e adicionar ${product.name}`
              : `Adicionar ${product.name} ao carrinho`
          }
        >
          {product.customizable
            ? 'PERSONALIZAR E ADICIONAR'
            : 'ADICIONAR AO CARRINHO'}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  )
}

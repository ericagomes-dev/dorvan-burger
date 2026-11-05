import { useRef, useState } from 'react'
import { addOns, formatPrice, type CartLine, type MenuProduct } from '../data/menu'
import { productImageAlt, productImageFallbackDescription } from '../data/productImageCopy'
import { SafeImage } from './SafeImage'
import { ProductImageFallback } from './ProductImageFallback'
import { useDialogFocus } from './useDialogFocus'

type Choice = Omit<CartLine, 'key' | 'productId'>
type Props = { product: MenuProduct; initial?: CartLine; onClose: () => void; onSave: (choice: Choice) => void }

const extras = addOns.filter((item) => item.group === 'Extra')
const sauces = addOns.filter((item) => item.group === 'Molho')

export function ProductCustomizer({ product, initial, onClose, onSave }: Props) {
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initial?.addOnIds ?? [])
  const [removed, setRemoved] = useState<string[]>(initial?.removedIngredients ?? [])
  const [note, setNote] = useState(initial?.note ?? '')
  const dialogRef = useRef<HTMLElement>(null)
  useDialogFocus(dialogRef, onClose)
  const extraCents = addOns.filter((item) => selectedAddOns.includes(item.id)).reduce((total, item) => total + item.priceCents, 0)
  const unitPrice = product.priceCents + extraCents
  const toggle = (values: string[], value: string, setValues: (next: string[]) => void) => setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="customizer dialog-panel" role="dialog" aria-modal="true" aria-labelledby="customizer-title" aria-describedby="customizer-description" tabIndex={-1}>
        <button className="dialog-close" type="button" data-dialog-initial-focus onClick={onClose} aria-label="Fechar personalização">×</button>
        <div className={product.image ? 'customizer-image' : 'customizer-image product-placeholder'}>
          {product.image ? <SafeImage src={product.image} alt={productImageAlt(product)} fallbackClassName="product-image-fallback" fallback={<ProductImageFallback name={product.name} description={productImageFallbackDescription(product)} mark="✳" />} /> : <span className="placeholder-mark" aria-hidden="true">✳</span>}
        </div>
        <div className="customizer-content">
          <span className="section-number">DO SEU JEITO</span>
          <h2 id="customizer-title">{initial ? 'Edite seu item' : product.name}</h2>
          <p id="customizer-description" className="customizer-description">{product.description}</p>
          <p className="customizer-price">{formatPrice(unitPrice)} <small>por unidade · preço base {formatPrice(product.priceCents)}</small></p>

          {product.ingredients.length > 0 && (
            <fieldset className="customizer-section">
              <legend><span>01</span> Retirar ingredientes</legend>
              <p className="section-help">Marque o que prefere retirar. Essa escolha não altera o preço.</p>
              <div className="ingredient-options">
                {product.ingredients.map((ingredient) => (
                  <label className="ingredient-option" key={ingredient}>
                    <input type="checkbox" checked={removed.includes(ingredient)} onChange={() => toggle(removed, ingredient, setRemoved)} />
                    <span>Sem {ingredient}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="customizer-section">
            <legend><span>02</span> Adicionar ingredientes</legend>
            <p className="section-help">Cada adicional marcado aumenta o valor do pedido.</p>
            <div className="addon-options">
              {extras.map((item) => (
                <label className="addon-option" key={item.id}>
                  <input type="checkbox" checked={selectedAddOns.includes(item.id)} onChange={() => toggle(selectedAddOns, item.id, setSelectedAddOns)} />
                  {item.image && <SafeImage className="addon-thumbnail" src={item.image} alt="" loading="lazy" />}
                  <span className="addon-name">{item.name}</span>
                  <span className="addon-price">+ {formatPrice(item.priceCents)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="customizer-section">
            <legend><span>03</span> Escolher molhos</legend>
            <p className="section-help">Escolha os molhos que quer adicionar.</p>
            <div className="addon-options sauce-options">
              {sauces.map((item) => (
                <label className="addon-option" key={item.id}>
                  <input type="checkbox" checked={selectedAddOns.includes(item.id)} onChange={() => toggle(selectedAddOns, item.id, setSelectedAddOns)} />
                  {item.image && <SafeImage className="addon-thumbnail" src={item.image} alt="" loading="lazy" />}
                  <span className="addon-name">{item.name}</span>
                  <span className="addon-price">+ {formatPrice(item.priceCents)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="kitchen-note">
            <label className="note-label" htmlFor="kitchen-note">04 · Observações para a cozinha</label>
            <textarea id="kitchen-note" rows={3} maxLength={180} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: ponto da carne, sem pimenta..." />
          </div>

          <div className="customizer-bottom">
            <div className="quantity-picker" aria-label="Quantidade">
              <span>Quantidade</span>
              <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= 20} onClick={() => setQuantity(Math.min(20, quantity + 1))}>+</button>
            </div>
            <button className="button button-orange customizer-submit" type="button" onClick={() => onSave({ quantity, addOnIds: selectedAddOns, removedIngredients: removed, note: note.trim() })}>
              {initial ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR AO PEDIDO'} · {formatPrice(unitPrice * quantity)}
            </button>
          </div>
          <p className="demo-caption">Montagem demonstrativa. Nenhum pedido é enviado.</p>
        </div>
      </section>
    </div>
  )
}

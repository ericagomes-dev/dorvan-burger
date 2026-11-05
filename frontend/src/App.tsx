import { useEffect, useState } from 'react'
import { CartDrawer } from './components/CartDrawer'
import { ProductCard } from './components/ProductCard'
import { ProductCustomizer } from './components/ProductCustomizer'
import { ReviewsSection } from './components/ReviewsSection'
import { SafeImage } from './components/SafeImage'
import { SiteHeader } from './components/SiteHeader'
import { addOns, categories, images, products, type CartLine, type Category, type MenuProduct } from './data/menu'
import './App.scss'

const CART_STORAGE_KEY = 'dorvan-demo-cart-v1'

function normalizeSavedCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []
  const seenKeys = new Set<string>()
  return value.flatMap((candidate): CartLine[] => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return []
    const line = candidate as Record<string, unknown>
    if (typeof line.key !== 'string' || line.key.length < 1 || line.key.length > 100 || seenKeys.has(line.key)
      || typeof line.productId !== 'string' || !Number.isSafeInteger(line.quantity)
      || (line.quantity as number) < 1 || (line.quantity as number) > 20
      || !Array.isArray(line.addOnIds) || !Array.isArray(line.removedIngredients) || typeof line.note !== 'string') return []

    const product = products.find((item) => item.id === line.productId)
    if (!product) return []
    seenKeys.add(line.key)
    const canCustomize = Boolean(product.customizable)
    const allowedAddOnIds = new Set(addOns.map((item) => item.id))
    const addOnIds = canCustomize
      ? [...new Set(line.addOnIds.filter((id): id is string => typeof id === 'string' && allowedAddOnIds.has(id)))]
      : []
    const removedIngredients = canCustomize
      ? [...new Set(line.removedIngredients.filter((ingredient): ingredient is string => typeof ingredient === 'string' && product.ingredients.includes(ingredient)))]
      : []

    return [{
      key: line.key,
      productId: product.id,
      quantity: line.quantity as number,
      addOnIds,
      removedIngredients,
      note: canCustomize ? line.note.slice(0, 180) : '',
    }]
  })
}

function readSavedCart(): CartLine[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (!saved) return []
    const value: unknown = JSON.parse(saved)
    return normalizeSavedCart(value)
  } catch {
    return []
  }
}

function App() {
  const [cart, setCart] = useState<CartLine[]>(readSavedCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [customizer, setCustomizer] = useState<{ product: MenuProduct; line?: CartLine } | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('Todos')
  const filteredProducts = activeCategory === 'Todos' ? products : products.filter((product) => product.category === activeCategory)
  const cartCount = cart.reduce((count, line) => count + line.quantity, 0)

  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)) } catch { /* armazenamento local pode estar indisponível */ }
  }, [cart])

  useEffect(() => {
    if (!cartOpen && !customizer) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [cartOpen, customizer])

  const addProduct = (product: MenuProduct) => {
    if (product.customizable) setCustomizer({ product })
    else {
      setCart((current) => [...current, { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, productId: product.id, quantity: 1, addOnIds: [], removedIngredients: [], note: '' }])
      setCartOpen(true)
    }
  }
  const saveCustomization = (choice: Omit<CartLine, 'key' | 'productId'>) => {
    if (!customizer) return
    if (customizer.line) {
      setCart((current) => current.map((line) => line.key === customizer.line?.key ? { ...line, ...choice } : line))
    } else {
      setCart((current) => [...current, { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, productId: customizer.product.id, ...choice }])
    }
    setCustomizer(null)
    setCartOpen(true)
  }
  const editLine = (line: CartLine) => {
    const product = products.find((item) => item.id === line.productId)
    if (product?.customizable) {
      setCartOpen(false)
      setCustomizer({ product, line })
    }
  }
  const updateQuantity = (key: string, delta: number) => setCart((current) => current.flatMap((line) => {
    if (line.key !== key) return [line]
    if (!Number.isSafeInteger(delta)) return [line]
    const quantity = Math.min(20, line.quantity + delta)
    return quantity > 0 ? [{ ...line, quantity }] : []
  }))
  const removeLine = (key: string) => setCart((current) => current.filter((line) => line.key !== key))

  const clearCart = () => {
    setCart([])
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]))
    } catch {
      // O carrinho em memória também será limpo.
    }
  }


  return (
    <main>
      <SiteHeader cartCount={cartCount} onCart={() => setCartOpen(true)} onCombos={() => setActiveCategory('Combos')} />
      <section className="hero" id="inicio">
        <SafeImage className="hero-photo" src={images.hero} alt="Hambúrguer artesanal da Dorvan com fritas e molho" fetchPriority="high" fallbackClassName="hero-photo-fallback" />
        <div className="hero-shade" />
        <div className="hero-copy"><p className="eyebrow"><span /> SÃO GONÇALO, RJ · BURGER DE RUA</p><h1>DORVAN<br /><em>BURGER.</em></h1><p className="hero-slogan">Atitude de sobra.</p><p className="hero-intro">Burger feito na chapa, acompanhamentos caprichados e aquele sabor que pede mais uma mordida. Conheça o cardápio e monte seu pedido.</p><div className="hero-actions"><a className="button button-orange" href="#cardapio">VER CARDÁPIO <span aria-hidden="true">↘</span></a><button className="button button-outline" type="button" onClick={() => setCartOpen(true)}>MONTAR PEDIDO <span aria-hidden="true">＋</span></button></div></div>
        <div className="hero-stamp"><span>FEITO NA</span><strong>BRASA</strong><span>ATITUDE DE SOBRA</span></div><div className="hero-caption">FEITO NA CHAPA. SERVIDO COM ATITUDE.</div>
      </section>
      <div className="service-strip"><span>ENTREGA EM SÃO GONÇALO</span><b>✳</b><span>RETIRADA NO LOCAL</span><b>✳</b><span>PEDIDOS ONLINE</span></div>

      <section className="menu-section section-pad" id="cardapio">
        <div className="menu-heading"><div><span className="section-number">01 / CARDÁPIO</span><h2>Escolha sua<br /><em>próxima obsessão.</em></h2></div><p>Adicione ao pedido, personalize<br />e confira o total no carrinho.</p></div>
        <div className="category-tabs" aria-label="Filtrar cardápio">{categories.map((category) => <button type="button" key={category} className={activeCategory === category ? 'category-tab active' : 'category-tab'} onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category}>{category}</button>)}</div>
        <div className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addProduct} />)}</div>
        <p className="menu-disclaimer">Confira os itens e o total no carrinho antes de revisar seu pedido.</p>
        <div className="menu-feature"><SafeImage src={images.sodaGroup} alt="Seleção ilustrativa de refrigerantes gelados" loading="lazy" fallbackClassName="menu-feature-fallback" fallback={<span>REFRIGERANTES GELADOS</span>} /><div><span className="section-number">PRA ACOMPANHAR</span><h3>Gelada no ponto.</h3><p>Tem refrigerantes, suco, água e milk-shake. Esta foto promocional é ilustrativa; as imagens individuais aparecem nos respectivos produtos quando disponíveis.</p></div></div>
      </section>

      <section className="about-section section-pad" id="sobre"><div className="about-photo"><SafeImage src={images.interior} alt="Salão e balcão de hamburgueria com iluminação quente" loading="lazy" fallbackClassName="about-photo-fallback" fallback={<span>AMBIENTE DORVAN</span>} /><span>SABOR DE VERDADE</span></div><div className="about-copy"><span className="section-number">02 / SOBRE A DORVAN</span><h2>DA NOSSA CHAPA<br /><em>PRA SUA QUEBRADA</em></h2><p className="about-subtitle">Sabor de verdade. Atitude de sobra.</p><p>Na Dorvan Burger, cada pedido é preparado para quem gosta de hambúrguer bem feito, acompanhamentos caprichados e aquele sabor que dá vontade de repetir.</p><div className="about-points"><span><b>01</b> Hambúrguer preparado na chapa.</span><span><b>02</b> Entrega e retirada com praticidade.</span><span><b>03</b> Combinações para todos os apetites.</span><span><b>04</b> Sabor e qualidade em cada pedido.</span></div></div></section>

      <ReviewsSection />
      <footer className="footer" id="contato"><a className="wordmark footer-logo" href="#inicio"><SafeImage src={images.logo} alt="Dorvan Burger — Atitude de sobra" fallbackClassName="brand-image-fallback" fallback={<><strong>D<span>.</span></strong><small>DORVAN BURGER</small></>} /></a><div className="footer-contact"><span>ENTREGA E RETIRADA</span><p>Entrega em São Gonçalo.<br />Retirada no local.</p></div><div className="footer-contact"><span>PEDIDOS ONLINE</span><p>Monte seu pedido pelo cardápio e confira os detalhes no carrinho.</p></div><div className="footer-links"><span>NAVEGUE</span><a href="#inicio">Início</a><a href="#cardapio">Cardápio</a><a href="#sobre">Sobre</a><a href="#avaliacoes">Avaliações</a></div><small className="copyright">© 2026 DORVAN BURGER · SABOR DE VERDADE. ATITUDE DE SOBRA.</small></footer>

      {customizer && <ProductCustomizer key={`${customizer.product.id}-${customizer.line?.key ?? 'new'}`} product={customizer.product} initial={customizer.line} onClose={() => setCustomizer(null)} onSave={saveCustomization} />}
      {cartOpen && <CartDrawer lines={cart} onClose={() => setCartOpen(false)} onEdit={editLine} onQuantity={updateQuantity} onRemove={removeLine} onClear={clearCart} />}
      <button className="floating-cart" type="button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho com ${cartCount} itens`}>CARRINHO <b>{cartCount}</b></button>
    </main>
  )
}

export default App

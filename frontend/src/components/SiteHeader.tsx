import { useState } from 'react'
import { images } from '../data/menu'
import { SafeImage } from './SafeImage'

type Props = { cartCount: number; onCart: () => void; onCombos: () => void }

export function SiteHeader({ cartCount, onCart, onCombos }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  return (
    <header className="topbar">
      <a className="wordmark" href="#inicio" aria-label="Dorvan Burger — início" onClick={closeMenu}><SafeImage src={images.logo} alt="Dorvan Burger — Atitude de sobra" fallbackClassName="brand-image-fallback" fallback={<><strong>D<span>.</span></strong><small>DORVAN BURGER</small></>} /></a>
      <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Navegação principal">
        <a href="#inicio" onClick={closeMenu}>INÍCIO</a><a href="#cardapio" onClick={closeMenu}>CARDÁPIO</a><a href="#cardapio" onClick={() => { onCombos(); closeMenu() }}>COMBOS</a><a href="#sobre" onClick={closeMenu}>SOBRE</a><a href="#avaliacoes" onClick={closeMenu}>AVALIAÇÕES</a>
      </nav>
      <div className="header-actions"><button className="cart-trigger" type="button" onClick={onCart} aria-label={`Abrir carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}><span aria-hidden="true">▱</span><b aria-live="polite" aria-atomic="true">{cartCount}</b></button><a className="nav-order" href="#cardapio">PEÇA AGORA <span aria-hidden="true">↗</span></a></div>
    </header>
  )
}

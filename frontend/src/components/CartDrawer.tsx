
import { useRef, useState, type FormEvent } from 'react'
import {
  addOns,
  DELIVERY_FEE_CENTS,
  formatPrice,
  products,
  type CartLine,
} from '../data/menu'
import { useDialogFocus } from './useDialogFocus'

type Props = {
  lines: CartLine[]
  onClose: () => void
  onEdit: (line: CartLine) => void
  onQuantity: (key: string, delta: number) => void
  onRemove: (key: string) => void
  onClear: () => void
}

export function CartDrawer({
  lines,
  onClose,
  onEdit,
  onQuantity,
  onRemove,
  onClear,
}: Props) {
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery')
  const [payment, setPayment] = useState('')
  const [installments, setInstallments] = useState('1')
  const [pixCopied, setPixCopied] = useState(false)

  const demoPixCode =
    'DORVAN-DEMO-PIX-NAO-PAGAVEL-APENAS-ILUSTRACAO'
  const [needsChange, setNeedsChange] = useState(false)
  const [changeFor, setChangeFor] = useState('')
  const [changeError, setChangeError] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null)
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const idempotencyKey = useRef<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useDialogFocus(dialogRef, onClose)

  const subtotal = lines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId)

    const additions = addOns
      .filter((item) => line.addOnIds.includes(item.id))
      .reduce((total, item) => total + item.priceCents, 0)

    return sum + ((product?.priceCents ?? 0) + additions) * line.quantity
  }, 0)

  const fee =
    fulfillment === 'delivery' && lines.length
      ? DELIVERY_FEE_CENTS
      : 0

  const total = subtotal + fee

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setChangeError('')
    setCheckoutError('')

    if (!['pix', 'credito', 'debito', 'dinheiro'].includes(payment)) {
      setCheckoutError('Escolha uma forma de pagamento para continuar.')
      return
    }

    const formData = new FormData(event.currentTarget)

    const getValue = (name: string) =>
      String(formData.get(name) ?? '').trim()

    const name = getValue('name')
    const phone = getValue('phone')
    const address = getValue('address')
    const phoneDigits = phone.replace(/\D/g, '')

    // Não permite carrinho vazio
    if (!lines.length) {
      setCheckoutError(
        'Seu carrinho está vazio. Adicione um produto antes de continuar.',
      )
      return
    }

    // Validação do nome
    if (name.length < 2) {
      setCheckoutError('Informe seu nome corretamente.')
      return
    }

    // Validação do telefone com DDD
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      setCheckoutError(
        'Telefone inválido. Informe o DDD e o número correto.',
      )
      return
    }

    // Validação do endereço de entrega
    if (fulfillment === 'delivery') {
      if (address.length < 5) {
        setCheckoutError('Informe o endereço completo.')
        return
      }

      if (!/\d/.test(address)) {
        setCheckoutError(
          'Informe o número do imóvel junto com o endereço.',
        )
        return
      }
    }

    // Validação das quantidades
    if (
      lines.some(
        (line) =>
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          line.quantity > 20,
      )
    ) {
      setCheckoutError(
        'Confira as quantidades: cada produto deve ter entre 1 e 20 unidades.',
      )
      return
    }

    // Validação do troco
    if (payment === 'dinheiro' && needsChange) {
      const changeCents = Math.round(
        Number(changeFor.replace(',', '.')) * 100,
      )

      if (
        !Number.isSafeInteger(changeCents) ||
        changeCents < total
      ) {
        setChangeError(
          `Informe um valor de troco igual ou superior a ${formatPrice(total)}.`,
        )
        return
      }
    }

    const cashChangeForCents =
      payment === 'dinheiro' && needsChange
        ? Math.round(Number(changeFor.replace(',', '.')) * 100)
        : undefined

    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID()
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey.current,
        },
        body: JSON.stringify({
          mode: 'demo',
          fulfillment,
          paymentMethod: payment,
          ...(cashChangeForCents !== undefined
            ? { cashChangeForCents }
            : {}),
          customer: {
            name,
            phone,
            ...(fulfillment === 'delivery'
              ? {
                  address,
                  reference: getValue('reference'),
                }
              : {}),
            notes: getValue('orderNote'),
          },
          items: lines.map((line) => ({
            id: line.productId,
            quantity: line.quantity,
            addOnIds: line.addOnIds,
            removedIngredients: line.removedIngredients,
            note: line.note,
          })),
        }),
      })

      const result: unknown = await response.json()

      if (
        !response.ok ||
        !result ||
        typeof result !== 'object' ||
        !('mode' in result) ||
        result.mode !== 'demo' ||
        !('paymentStatus' in result) ||
        result.paymentStatus !== 'not_charged' ||
        !('orderId' in result) ||
        typeof result.orderId !== 'string'
      ) {
        throw new Error('Não foi possível confirmar o pedido.')
      }

      setCheckoutOrderId(result.orderId)

      if (
        'totalCents' in result &&
        typeof result.totalCents === 'number'
      ) {
        setServerTotal(result.totalCents)
      }

      idempotencyKey.current = null
      onClear()
    } catch {
      setCheckoutError(
        'Não foi possível confirmar o pedido. Tente novamente sem fechar esta tela.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="dialog-backdrop cart-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        ref={dialogRef}
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        aria-describedby="cart-description"
        tabIndex={-1}
      >
        <div className="cart-heading">
          <div>
            <span className="section-number">SEU PEDIDO</span>

            <h2 id="cart-title">
              Carrinho{' '}
              <span aria-live="polite" aria-atomic="true">
                ({lines.reduce((count, line) => count + line.quantity, 0)})
              </span>
            </h2>

            <p id="cart-description" className="sr-only">
              Resumo do pedido e checkout demonstrativo.
            </p>
          </div>

          <button
            className="dialog-close"
            type="button"
            data-dialog-initial-focus
            onClick={onClose}
            aria-label="Fechar carrinho"
          >
            ×
          </button>
        </div>

        {checkoutOrderId ? (
          <div className="cart-empty cart-order-success">
            <span aria-hidden="true">✓</span>

            <h3>Pedido registrado!</h3>

            <p>Pedido {checkoutOrderId}</p>

            {serverTotal !== null && (
              <p>Total registrado: {formatPrice(serverTotal)}</p>
            )}

            <p className="success-payment-notice">
              Nenhum pagamento foi realizado. Esta é uma confirmação demonstrativa.
            </p>

            <button
              className="button button-orange"
              type="button"
              onClick={onClose}
            >
              CONTINUAR
            </button>
          </div>
        ) : !lines.length ? (
          <div className="cart-empty">
            <span aria-hidden="true">▱</span>

            <h3>Seu carrinho está vazio</h3>

            <p>
              Escolha seus favoritos no cardápio e monte seu pedido.
            </p>

            <button
              className="button button-orange"
              type="button"
              onClick={() => {
                onClose()
                document
                  .getElementById('cardapio')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              VER CARDÁPIO
            </button>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {lines.map((line) => {
                const product = products.find(
                  (item) => item.id === line.productId,
                )

                if (!product) return null

                const extras = addOns.filter((item) =>
                  line.addOnIds.includes(item.id),
                )

                const unit =
                  product.priceCents +
                  extras.reduce(
                    (sum, item) => sum + item.priceCents,
                    0,
                  )

                return (
                  <article className="cart-line" key={line.key}>
                    <div className="cart-line-top">
                      <div>
                        <h3>{product.name}</h3>
                        <strong>
                          {formatPrice(unit * line.quantity)}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="remove-line"
                        onClick={() => onRemove(line.key)}
                        aria-label={`Remover ${product.name}`}
                      >
                        Remover
                      </button>
                    </div>

                    {(extras.length > 0 ||
                      line.removedIngredients.length > 0 ||
                      line.note) && (
                      <p className="cart-custom-note">
                        {extras
                          .map((item) => `+ ${item.name}`)
                          .join(' · ')}
                        {line.removedIngredients
                          .map((item) => ` · sem ${item}`)
                          .join('')}
                        {line.note && ` · ${line.note}`}
                      </p>
                    )}

                    <div className="cart-line-bottom">
                      <div className="quantity-picker">
                        <button
                          type="button"
                          aria-label={`Diminuir ${product.name}`}
                          onClick={() => onQuantity(line.key, -1)}
                        >
                          −
                        </button>

                        <span>{line.quantity}</span>

                        <button
                          type="button"
                          aria-label={`Aumentar ${product.name}`}
                          onClick={() => onQuantity(line.key, 1)}
                        >
                          +
                        </button>
                      </div>

                      {product.customizable && (
                        <button
                          type="button"
                          className="edit-line"
                          onClick={() => onEdit(line)}
                        >
                          Editar personalização
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            <form className="checkout-form" onSubmit={submit}>
              <fieldset className="checkout-group">
                <legend>Como quer receber?</legend>

                <label>
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillment === 'delivery'}
                    onChange={() => setFulfillment('delivery')}
                  />
                  Entrega
                </label>

                <label>
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillment === 'pickup'}
                    onChange={() => setFulfillment('pickup')}
                  />
                  Retirada no local
                </label>
              </fieldset>

              <div className="checkout-total">
                <span>Subtotal</span>
                <b>{formatPrice(subtotal)}</b>

                <span>
                  Taxa de entrega <small>(demonstrativa)</small>
                </span>
                <b>{formatPrice(fee)}</b>

                <strong>Total</strong>
                <strong>{formatPrice(total)}</strong>
              </div>

              <h3 className="checkout-subheading">
                Checkout demonstrativo
              </h3>

              <p className="checkout-local-notice">
                Os dados informados serão enviados à API local para
                registrar o pedido demonstrativo.
              </p>

              <label>
                Nome
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Como podemos te chamar?"
                />
              </label>

              <label>
                Telefone
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                onChange={(event) => {
                  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 11)
                }}
                  required
                  maxLength={11}
                  pattern="[0-9]{10,11}"
                  title="Informe um telefone válido com DDD."
                  placeholder="(21) 99999-9999"
                />
              </label>

              {fulfillment === 'delivery' && (
                <div className="address-fields">
                  <label>
                    Endereço
                    <input
                      name="address"
                      autoComplete="street-address"
                      required
                      minLength={5}
                      maxLength={300}
                      placeholder="Rua, número e complemento"
                    />
                  </label>

                  <label>
                    Referência (opcional)
                    <input
                      name="reference"
                      maxLength={180}
                      placeholder="Perto de..."
                    />
                  </label>
                </div>
              )}

              <label>
                Observações do pedido
                <textarea
                  name="orderNote"
                  rows={2}
                  maxLength={240}
                  placeholder="Alguma orientação para este pedido?"
                />
              </label>

              <label>
                Forma de pagamento
                <select
                  name="payment"
                  value={payment}
                  required
                  onChange={(event) => {
                    setPayment(event.target.value)
                    setPixCopied(false)
                  }}
                >
                  <option value="" disabled>Selecione uma forma de pagamento</option>
                  <option value="pix">Pix (simulação)</option>
                  <option value="credito">
                    Cartão de crédito (simulação)
                  </option>
                  <option value="debito">
                    Cartão de débito (simulação)
                  </option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </label>

              {payment === 'pix' && (
                <section className="demo-payment-panel">
                  <h4>Pix demonstrativo</h4>
                  <p>Este QR Code é apenas ilustrativo e não realiza pagamentos.</p>
                  <div className="demo-qr" aria-label="QR Code ilustrativo não pagável">
                    <div className="demo-qr-pattern" />
                    <span>DEMO</span>
                  </div>
                  <label>
                    Código Pix demonstrativo
                    <input readOnly value={demoPixCode} aria-label="Código Pix demonstrativo" />
                  </label>
                  <button
                    type="button"
                    className="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(demoPixCode)
                        setPixCopied(true)
                      } catch {
                        setPixCopied(false)
                      }
                    }}
                  >
                    {pixCopied ? 'CÓDIGO COPIADO!' : 'COPIAR CÓDIGO'}
                  </button>
                </section>
              )}

              {payment === 'credito' && (
                <section className="demo-payment-panel">
                  <h4>Cartão de crédito demonstrativo</h4>
                  <p>Cartão fictício para apresentação. Não informe dados reais.</p>
                  <div className="demo-card">
                    <span>DORVAN BURGER</span>
                    <strong>0000 0000 0000 0000</strong>
                    <small>00/00 · CARTÃO FICTÍCIO</small>
                  </div>
                  <label>
                    Parcelamento
                    <select
                      value={installments}
                      onChange={(event) => setInstallments(event.target.value)}
                    >
                      <option value="1">1x sem juros</option>
                      <option value="2">2x sem juros</option>
                      <option value="3">3x sem juros</option>
                      <option value="4">4x sem juros</option>
                      <option value="5">5x sem juros</option>
                      <option value="6">6x sem juros</option>
                    </select>
                  </label>
                  <p>
                    {installments}x de{' '}
                    {formatPrice(Math.ceil(total / Number(installments)))}
                  </p>
                </section>
              )}

              {payment === 'debito' && (
                <section className="demo-payment-panel">
                  <h4>Cartão de débito demonstrativo</h4>
                  <p>Cartão fictício. Não informe dados reais.</p>
                  <div className="demo-card">
                    <span>DORVAN BURGER</span>
                    <strong>0000 0000 0000 0000</strong>
                    <small>DÉBITO · CARTÃO FICTÍCIO</small>
                  </div>
                  <p>Pagamento demonstrativo à vista.</p>
                </section>
              )}
              {payment === 'dinheiro' && (
                <fieldset className="checkout-group">
                  <legend>Precisa de troco?</legend>

                  <label>
                    <input
                      type="radio"
                      name="change"
                      checked={needsChange}
                      onChange={() => setNeedsChange(true)}
                    />
                    Sim
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="change"
                      checked={!needsChange}
                      onChange={() => {
                        setNeedsChange(false)
                        setChangeError('')
                      }}
                    />
                    Não
                  </label>

                  {needsChange && (
                    <label className="change-input">
                      Troco para R$
                      <input
                        inputMode="decimal"
                        aria-invalid={Boolean(changeError)}
                        aria-describedby={
                          changeError ? 'change-error' : undefined
                        }
                        value={changeFor}
                        onChange={(event) => {
                          const value = event.target.value.replace(/[^0-9,.]/g, '')
                          const separatorIndex = value.search(/[,.]/)
                          const cleaned = separatorIndex === -1
                            ? value
                            : value.slice(0, separatorIndex + 1) +
                              value.slice(separatorIndex + 1).replace(/[,.]/g, '').slice(0, 2)
                          setChangeFor(cleaned)
                        }}
                        placeholder="100,00"
                      />
                    </label>
                  )}

                  {changeError && (
                    <p
                      id="change-error"
                      className="form-error"
                      role="alert"
                    >
                      {changeError}
                    </p>
                  )}
                </fieldset>
              )}

              <p className="demo-warning">
                <strong>
                  Projeto demonstrativo: nenhum pagamento real será realizado.
                </strong>
                {' '}
                Não são solicitados dados de cartão e nenhum pedido será
                enviado a uma cozinha ou estabelecimento.
              </p>

              {checkoutError && (
                <p className="form-error" role="alert">
                  {checkoutError}
                </p>
              )}

              <button
                className="button button-orange checkout-submit"
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting
                  ? 'REGISTRANDO PEDIDO…'
                  : `REGISTRAR PEDIDO · ${formatPrice(total)}`}

                {!submitting && (
                  <span aria-hidden="true">↗</span>
                )}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  )
}

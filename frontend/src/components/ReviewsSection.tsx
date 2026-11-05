import { useState, type FormEvent } from 'react'

type Review = { name: string; rating: number; comment: string; demo?: boolean }
const exampleReviews: Review[] = [
  { name: 'Exemplo de cliente', rating: 5, comment: 'Comentário de demonstração: burger caprichado e combinação perfeita com as fritas.', demo: true },
  { name: 'Exemplo de cliente', rating: 4, comment: 'Comentário de demonstração: sabor de brasa e atendimento acolhedor.', demo: true },
  { name: 'Exemplo de cliente', rating: 5, comment: 'Comentário de demonstração: opções para pedir em casa ou retirar.', demo: true },
]

export function ReviewsSection() {
  const [reviews, setReviews] = useState(exampleReviews)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('reviewName') ?? '').trim()
    const comment = String(form.get('reviewComment') ?? '').trim()
    const rating = Number(form.get('rating'))
    if (name.length < 2 || comment.length < 10 || rating < 1 || rating > 5) {
      setError('Preencha seu nome, uma nota de 1 a 5 e um comentário com pelo menos 10 caracteres.')
      return
    }
    setReviews((current) => [{ name, rating, comment }, ...current])
    setError('')
    setSent(true)
    event.currentTarget.reset()
  }
  return (
    <section className="reviews-section section-pad" id="avaliacoes">
      <div className="reviews-heading"><span className="section-number">04 / AVALIAÇÕES</span><h2>O papo é reto.<br /><em>E o burger também.</em></h2><p>Os cartões abaixo são exemplos de interface; não representam avaliações reais de clientes.</p></div>
      <div className="reviews-content"><div className="review-list">{reviews.map((review, index) => <article className="review-card" key={`${review.name}-${index}`}><span className="review-stars" role="img" aria-label={`${review.rating} de 5 estrelas`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>“{review.comment}”</p><div><strong>{review.name}</strong><small>{review.demo ? 'AVALIAÇÃO FICTÍCIA · EXEMPLO' : 'PRÉVIA LOCAL · NÃO PUBLICADA'}</small></div></article>)}</div>
        <form className="review-form" onSubmit={submit}><h3>Deixe uma prévia</h3><p>O comentário aparece somente nesta página e não é enviado nem salvo.</p><label>Seu nome<input name="reviewName" minLength={2} maxLength={50} required placeholder="Seu nome" /></label><label>Sua nota<select name="rating" defaultValue="5"><option value="5">5 estrelas</option><option value="4">4 estrelas</option><option value="3">3 estrelas</option><option value="2">2 estrelas</option><option value="1">1 estrela</option></select></label><label>Comentário<textarea name="reviewComment" minLength={10} maxLength={240} required rows={3} placeholder="Conte o que achou..." /></label>{error && <p className="form-error" role="alert">{error}</p>}{sent && <p className="simulation-confirmation" role="status">Prévia adicionada somente nesta página.</p>}<button className="button button-orange" type="submit">ADICIONAR PRÉVIA <span aria-hidden="true">↗</span></button></form>
      </div>
    </section>
  )
}

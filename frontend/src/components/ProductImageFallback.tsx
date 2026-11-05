type Props = { name: string; description: string; mark: string }

export function ProductImageFallback({ name, description, mark }: Props) {
  return (
    <div className="product-image-fallback-content">
      <span className="placeholder-mark" aria-hidden="true">{mark}</span>
      <strong>{name}</strong>
      <span>{description}</span>
    </div>
  )
}

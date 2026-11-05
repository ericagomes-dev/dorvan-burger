import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src: string
  alt: string
  fallback?: ReactNode
  fallbackClassName?: string
}

export function SafeImage({ src, alt, fallback, fallbackClassName = '', className = '', ...imageProps }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (failedSrc === src) {
    return <div className={`image-fallback ${className} ${fallbackClassName}`.trim()} role="img" aria-label={alt}>{fallback}</div>
  }

  return <img {...imageProps} className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />
}

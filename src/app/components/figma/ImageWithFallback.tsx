import React, { useEffect, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

/** Steam CDN blocks many hotlinks unless Referer is omitted. */
function normalizeImageSrc(src?: string | null) {
  if (!src) return '';
  const trimmed = String(src).trim();
  if (!trimmed) return '';
  // Prefer sized Steam economy URLs when the catalogue returns a bare hash path
  if (
    trimmed.includes('steamstatic.com/economy/image/') &&
    !/\/\d+fx\d+f$/i.test(trimmed)
  ) {
    return `${trimmed}/512fx512f`;
  }
  return trimmed;
}

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const { src, alt, style, className, ...rest } = props
  const resolved = normalizeImageSrc(typeof src === 'string' ? src : '')

  useEffect(() => {
    setDidError(false)
  }, [resolved])

  if (!resolved) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-black/20 text-center align-middle ${className ?? ''}`}
        style={style}
        aria-label={alt || 'No image'}
      >
        <span className="text-[10px] uppercase tracking-wider text-white/35">No img</span>
      </div>
    )
  }

  if (didError) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-black/25 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={resolved} className="opacity-40" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      loading="lazy"
      {...rest}
      onError={() => setDidError(true)}
    />
  )
}

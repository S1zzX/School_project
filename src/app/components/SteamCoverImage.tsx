import { useEffect, useMemo, useState } from 'react';
import { steamCoverCandidates, type SteamCoverVariant } from '../lib/steamImages';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SteamCoverImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  steamAppId: number;
  variant?: SteamCoverVariant;
}

export function SteamCoverImage({
  steamAppId,
  variant = 'card',
  alt = '',
  className,
  style,
  ...rest
}: SteamCoverImageProps) {
  const candidates = useMemo(
    () => steamCoverCandidates(steamAppId, variant),
    [steamAppId, variant],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [steamAppId, variant]);

  if (index >= candidates.length) {
    return <ImageWithFallback src="" alt={alt} className={className} style={style} {...rest} />;
  }

  return (
    <img
      src={candidates[index]}
      alt={alt}
      className={className}
      style={style}
      onError={() => setIndex(i => i + 1)}
      {...rest}
    />
  );
}

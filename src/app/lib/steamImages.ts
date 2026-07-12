// Steam CDN cover art — no API key required when steamAppId is known

import type { ProductItem } from './products';

const STEAM_CDN = 'https://cdn.akamai.steamstatic.com/steam/apps';

export type SteamCoverVariant = 'hero' | 'card';

function steamAssetUrl(steamAppId: number, asset: string): string {
  return `${STEAM_CDN}/${steamAppId}/${asset}`;
}

/** Ordered fallbacks — some games (e.g. Forza Horizon 6) lack header.jpg but have library_hero.jpg */
export function steamCoverCandidates(
  steamAppId: number,
  variant: SteamCoverVariant = 'card',
): string[] {
  const assets = variant === 'hero'
    ? ['library_hero.jpg', 'header.jpg', 'capsule_616x353.jpg']
    : ['header.jpg', 'capsule_616x353.jpg', 'library_hero.jpg', 'library_600x900.jpg'];

  return assets.map(asset => steamAssetUrl(steamAppId, asset));
}

export function steamHeaderImage(steamAppId: number): string {
  return steamAssetUrl(steamAppId, 'header.jpg');
}

export function steamLibraryHeroImage(steamAppId: number): string {
  return steamAssetUrl(steamAppId, 'library_hero.jpg');
}

export function steamLibraryCover(steamAppId: number): string {
  return steamAssetUrl(steamAppId, 'library_600x900.jpg');
}

export function getProductImage(product: Pick<ProductItem, 'image' | 'steamAppId'>): string {
  if (product.steamAppId) return steamCoverCandidates(product.steamAppId, 'card')[0];
  return product.image;
}

export function getProductScreenshots(product: ProductItem): string[] {
  if (product.steamAppId) {
    return steamCoverCandidates(product.steamAppId, 'hero');
  }
  return product.screenshots?.length ? product.screenshots : [product.image];
}

export function applySteamImages(products: ProductItem[]): ProductItem[] {
  return products.map(p => {
    if (!p.steamAppId) return p;
    const image = steamCoverCandidates(p.steamAppId, 'card')[0];
    return {
      ...p,
      image,
      screenshots: steamCoverCandidates(p.steamAppId, 'hero'),
    };
  });
}

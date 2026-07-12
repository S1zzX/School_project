// livePrices.ts — Fetch and merge live market prices + Steam stats

import { useEffect, useMemo, useState } from 'react';
import { apiFetchCatalogLivePrices, type CatalogSteamStatsEntry } from './api';
import type { ProductItem } from './products';
import type { CatalogId } from './catalog';
import { applySteamImages } from './steamImages';

export interface LivePriceEntry {
  salePrice: number;
  normalPrice: number;
  discount: number;
  storeId?: string;
  title?: string;
  isOnSale?: boolean;
  salePriceChangedAt?: string | null;
  saleEndsAt?: string | null;
}

export type LivePriceMap = Record<string, LivePriceEntry>;
export type LiveStatsMap = Record<string, CatalogSteamStatsEntry>;

export const LIVE_PRICE_CATALOGS: CatalogId[] = ['steam-game-keys', 'gaming'];

function formatPlayerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export { formatPlayerCount };

export function applyLivePrices(
  products: ProductItem[],
  live: LivePriceMap,
  stats: LiveStatsMap = {},
): ProductItem[] {
  return applySteamImages(products).map(p => {
    if (!p.steamAppId) return p;

    const entry = live[String(p.steamAppId)];
    const steamStats = stats[String(p.steamAppId)];
    if (!entry && !steamStats) return p;

    const discount = entry && entry.discount > 0 ? entry.discount : undefined;
    const onSale = entry?.isOnSale || steamStats?.isOnSale || steamStats?.steamOnSale;

    return {
      ...p,
      ...(entry ? {
        price: entry.salePrice,
        origPrice: entry.normalPrice > entry.salePrice ? entry.normalPrice : p.origPrice,
        discount,
        badge: discount ? `-${discount}%` : p.badge,
        badgeColor: discount ? '#ef4444' : p.badgeColor,
        livePrice: true,
      } : {}),
      currentPlayers: steamStats?.currentPlayers ?? p.currentPlayers,
      ownersEstimate: steamStats?.ownersEstimate ?? p.ownersEstimate,
      isOnSale: onSale ?? p.isOnSale,
      salePriceChangedAt: entry?.salePriceChangedAt ?? steamStats?.salePriceChangedAt ?? p.salePriceChangedAt,
      saleEndsAt: entry?.saleEndsAt ?? steamStats?.saleEndsAt ?? p.saleEndsAt,
    };
  });
}

export function useLiveCatalogPrices(steamAppIds: number[]) {
  const [prices, setPrices] = useState<LivePriceMap>({});
  const [stats, setStats] = useState<LiveStatsMap>({});
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const idsKey = useMemo(
    () => [...new Set(steamAppIds.filter(id => id > 0))].sort((a, b) => a - b).join(','),
    [steamAppIds]
  );

  useEffect(() => {
    if (!idsKey) return;

    let cancelled = false;
    const ids = idsKey.split(',').map(Number);

    (async () => {
      setLoading(true);
      try {
        const data = await apiFetchCatalogLivePrices(ids);
        if (!cancelled) {
          setPrices(data.prices);
          setStats(data.stats ?? {});
          setFetchedAt(data.fetchedAt);
        }
      } catch (err) {
        console.warn('[livePrices] fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [idsKey]);

  return { prices, stats, loading, fetchedAt };
}

// src/app/lib/useSteamTopGames.ts
import { useEffect, useState } from 'react';
import { apiFetch } from './api';

export interface SteamTopGame {
  appid: number;
  name: string;
  headerImage: string;
  price: number;
  origPrice: number | null;
  discount: number;
  isFree: boolean;
}

interface SteamTopResponse {
  games: SteamTopGame[];
  fetchedAt: string;
  source: string;
  ttlSeconds: number;
}

export function useSteamTopGames(limit = 40) {
  const [games, setGames] = useState<SteamTopGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<SteamTopResponse>(`/catalog/steam-top?limit=${limit}`, { auth: false })
      .then(data => {
        if (!cancelled) {
          setGames(data.games ?? []);
          setFetchedAt(data.fetchedAt ?? null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.warn('[useSteamTopGames] fetch failed:', err);
          setError('Could not load Steam games.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [limit]);

  return { games, loading, error, fetchedAt };
}

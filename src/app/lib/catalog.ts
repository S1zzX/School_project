// Shared store catalog — used by header dropdown and home page sections

export type CatalogId =
  | 'all'
  | 'gaming'
  | 'steam-game-keys'
  | 'software'
  | 'subscriptions'
  | 'gift-cards'
  | 'random-weekend'
  | 'outlet';

export interface CatalogOption {
  id: CatalogId;
  label: string;
  /** Dedicated selling section on the home page */
  homeSection?: boolean;
  subtitle?: string;
}

export const CATALOG_OPTIONS: CatalogOption[] = [
  { id: 'all', label: 'All categories' },
  { id: 'gaming', label: 'Gaming' },
  {
    id: 'steam-game-keys',
    label: 'Steam game keys',
    homeSection: true,
    subtitle: 'Instant Steam activations — top titles at the best prices',
  },
  {
    id: 'software',
    label: 'Software',
    homeSection: true,
    subtitle: 'Licenses for productivity, creative tools, and operating systems',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    homeSection: true,
    subtitle: 'Game passes, streaming, and membership cards',
  },
  {
    id: 'gift-cards',
    label: 'Gift cards',
    homeSection: true,
    subtitle: 'Digital wallet top-ups and store credit',
  },
  {
    id: 'random-weekend',
    label: 'Random Weekend',
    homeSection: true,
    subtitle: 'Feeling lucky? Open a pack and uncover surprise titles!',
  },
  {
    id: 'outlet',
    label: 'Outlet',
    homeSection: true,
    subtitle: 'Clearance picks and last-chance deals',
  },
];

export const HOME_CATALOG_SECTIONS = CATALOG_OPTIONS.filter(c => c.homeSection);

export function getCatalogById(id: string | null | undefined): CatalogId {
  if (!id) return 'all';
  const found = CATALOG_OPTIONS.find(c => c.id === id);
  return found ? found.id : 'all';
}

export function getCatalogLabel(id: CatalogId): string {
  return CATALOG_OPTIONS.find(c => c.id === id)?.label ?? 'All categories';
}

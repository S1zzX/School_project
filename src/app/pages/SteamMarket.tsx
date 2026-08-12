import { useState, useEffect, useMemo } from 'react';
import {
  Search, ShieldCheck, ChevronDown, X, Layers, Filter,
  Eye, Store as StoreIcon, RefreshCw, ArrowLeft, SlidersHorizontal, Tag, Sparkles, Plus
} from 'lucide-react';
import {
  apiSearchSteamCS2,
  apiGetSteamCS2Listings,
  apiAddToCart,
  getUser,
  SteamMarketItem,
  SteamSingleListing,
} from '../lib/api';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Link, useNavigate } from 'react-router';

const WEAPON_CATEGORIES = [
  { id: 'all', label: 'All Items', sub: 'All CS2 Items' },
  { id: 'pistol', label: 'Pistols', sub: 'Pistols' },
  { id: 'smg', label: 'SMGs', sub: 'SMGs' },
  { id: 'rifle', label: 'Rifles', sub: 'Rifles' },
  { id: 'sniper', label: 'Sniper Rifles', sub: 'Sniper Rifles' },
  { id: 'shotgun', label: 'Shotguns', sub: 'Shotguns' },
  { id: 'machinegun', label: 'Machine Guns', sub: 'Machine Guns' },
  { id: 'knife', label: 'Knives', sub: 'Knives' },
  { id: 'hands', label: 'Gloves', sub: 'Gloves' },
  { id: 'sticker', label: 'Stickers & Patches', sub: 'Stickers & Patches' },
  { id: 'charm', label: 'Charms', sub: 'Charms' },
];

const EXTERIORS = [
  { id: 'all', label: 'All Exteriors' },
  { id: 'fn', label: 'Factory New (FN)' },
  { id: 'mw', label: 'Minimal Wear (MW)' },
  { id: 'ft', label: 'Field-Tested (FT)' },
  { id: 'ww', label: 'Well-Worn (WW)' },
  { id: 'bs', label: 'Battle-Scarred (BS)' },
];

const QUALITIES = [
  { id: 'all', label: 'All Qualities' },
  { id: 'normal', label: 'Normal' },
  { id: 'stattrak', label: 'StatTrak™' },
  { id: 'souvenir', label: 'Souvenir' },
];

const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'name', label: 'Name (A-Z)' },
];

// Visual float bar component
function FloatBar({ floatVal }: { floatVal: number }) {
  const clamped = Math.max(0, Math.min(1, floatVal));
  const percent = clamped * 100;

  return (
    <div className="space-y-1 my-2">
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-gs-surface-2 border border-gs-border flex">
        <div style={{ width: '7%' }} className="bg-sky-500 h-full" title="Factory New (0.00 - 0.07)" />
        <div style={{ width: '8%' }} className="bg-emerald-500 h-full" title="Minimal Wear (0.07 - 0.15)" />
        <div style={{ width: '23%' }} className="bg-amber-500 h-full" title="Field-Tested (0.15 - 0.38)" />
        <div style={{ width: '7%' }} className="bg-orange-500 h-full" title="Well-Worn (0.38 - 0.45)" />
        <div style={{ width: '55%' }} className="bg-rose-500 h-full" title="Battle-Scarred (0.45 - 1.00)" />
      </div>

      <div className="relative h-2">
        <div
          style={{ left: `${percent}%` }}
          className="absolute -top-3 -ml-1 w-2.5 h-3.5 bg-gs-text border border-gs-border rounded-sm shadow-md transition-all duration-300"
          title={`Float: ${floatVal}`}
        />
      </div>
    </div>
  );
}

export function SteamMarket({ embedMode = false }: { embedMode?: boolean }) {
  const navigate = useNavigate();
  const user = getUser();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [exterior, setExterior] = useState('all');
  const [quality, setQuality] = useState('all');
  const [sort, setSort] = useState('popular');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [includeDescription, setIncludeDescription] = useState(false);

  // Main Market Data & Pagination
  const [items, setItems] = useState<SteamMarketItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected item for 3rd Image Detail View Modal
  const [selectedMarketItem, setSelectedMarketItem] = useState<SteamMarketItem | null>(null);
  const [detailListings, setDetailListings] = useState<SteamSingleListing[]>([]);
  const [detailWeeklySales, setDetailWeeklySales] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // Detail View Filters
  const [detailSearch, setDetailSearch] = useState('');
  const [detailMinPrice, setDetailMinPrice] = useState('');
  const [detailMaxPrice, setDetailMaxPrice] = useState('');
  const [detailMinFloat, setDetailMinFloat] = useState(0);
  const [detailMaxFloat, setDetailMaxFloat] = useState(1);
  const [detailQuality, setDetailQuality] = useState('all');
  const [detailRequireSticker, setDetailRequireSticker] = useState(false);
  const [detailRequireCharm, setDetailRequireCharm] = useState(false);
  const [detailSort, setDetailSort] = useState('price_asc');

  // Cart Toast
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch Steam Market items
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = {
      q: search.trim(),
      category,
      exterior,
      quality,
      sort,
      start: 0,
      count: 40,
    };
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    apiSearchSteamCS2(params)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          setItems(res.items || []);
          setTotalCount(res.total_count || 0);
        } else {
          setError('Unable to load Steam Market data.');
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Error connecting to Steam Market.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, category, exterior, quality, sort, minPrice, maxPrice]);

  // Load More Handler
  const handleLoadMore = () => {
    if (loadingMore || items.length >= totalCount) return;
    setLoadingMore(true);

    const params: Record<string, string | number> = {
      q: search.trim(),
      category,
      exterior,
      quality,
      sort,
      start: items.length,
      count: 40,
    };
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    apiSearchSteamCS2(params)
      .then((res) => {
        if (res.success && res.items) {
          setItems((prev) => [...prev, ...res.items]);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  };

  // Handle clicking an item card to open 3rd UI Detail View
  const handleOpenDetail = (item: SteamMarketItem) => {
    setSelectedMarketItem(item);
    setDetailLoading(true);
    setDetailSearch('');
    setDetailMinPrice('');
    setDetailMaxPrice('');
    setDetailMinFloat(0);
    setDetailMaxFloat(1);
    setDetailQuality('all');
    setDetailRequireSticker(false);
    setDetailRequireCharm(false);

    apiGetSteamCS2Listings({
      market_hash_name: item.hash_name,
      base_price: item.price_usd,
      image: item.image,
    })
      .then((res) => {
        setDetailListings(res.listings || []);
        setDetailWeeklySales(res.weekly_sales || 2181);
      })
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  };

  // Add listing to cart
  const handleAddToCart = async (
    e: React.MouseEvent,
    itemTitle: string,
    priceUsd: number,
    imageUrl: string,
    id: string
  ) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    setAddingId(id);
    try {
      await apiAddToCart({
        item_id: `steam_${id}`,
        name: itemTitle,
        game: 'CS2',
        game_color: '#393b3e',
        type: 'CS2 Skin',
        platform: 'PC',
        price: priceUsd,
        original_price: null,
        image: imageUrl,
      });
      setCartToast(itemTitle);
      setTimeout(() => setCartToast(null), 3000);
    } catch {
      alert('Failed to add item to cart.');
    } finally {
      setAddingId(null);
    }
  };

  // Filtered detail listings for 3rd screenshot view
  const filteredDetailListings = useMemo(() => {
    return detailListings
      .filter((l) => {
        if (detailSearch) {
          const q = detailSearch.toLowerCase();
          const matchTitle = l.title.toLowerCase().includes(q);
          const matchPattern = String(l.pattern).includes(q);
          const matchFloat = String(l.float).includes(q);
          if (!matchTitle && !matchPattern && !matchFloat) return false;
        }
        if (detailMinPrice && l.price_usd < parseFloat(detailMinPrice)) return false;
        if (detailMaxPrice && l.price_usd > parseFloat(detailMaxPrice)) return false;
        if (l.float < detailMinFloat || l.float > detailMaxFloat) return false;
        if (detailQuality === 'stattrak' && !l.stattrak) return false;
        if (detailQuality === 'souvenir' && !l.souvenir) return false;
        if (detailRequireSticker && l.stickers.length === 0) return false;
        if (detailRequireCharm && l.charms.length === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (detailSort === 'price_asc') return a.price_usd - b.price_usd;
        if (detailSort === 'price_desc') return b.price_usd - a.price_usd;
        if (detailSort === 'float_asc') return a.float - b.float;
        if (detailSort === 'float_desc') return b.float - a.float;
        if (detailSort === 'pattern') return a.pattern - b.pattern;
        return 0;
      });
  }, [
    detailListings,
    detailSearch,
    detailMinPrice,
    detailMaxPrice,
    detailMinFloat,
    detailMaxFloat,
    detailQuality,
    detailRequireSticker,
    detailRequireCharm,
    detailSort,
  ]);

  const selectedCategoryLabel =
    WEAPON_CATEGORIES.find((c) => c.id === category)?.label || 'All Items';

  return (
    <div className={`steam-market-wrapper space-y-6 ${embedMode ? '' : 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap'); .steam-market-wrapper { font-family: 'Poppins', system-ui, sans-serif; }`}</style>

      {/* Cart Toast Notification */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-gs-border bg-gs-surface shadow-2xl">
          <Sparkles className="size-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gs-text">Added to Cart</p>
            <p className="text-xs text-gs-faint">{cartToast}</p>
          </div>
          <Link
            to="/cart"
            className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gs-text text-gs-bg hover:opacity-90 transition-all"
          >
            View Cart
          </Link>
        </div>
      )}

      {/* Main Steam Market Layout (2nd Screenshot format in Web UI Light English Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left Sidebar "FILTERS" */}
        <aside className="bg-gs-surface border border-gs-border rounded-2xl p-4 sm:p-5 space-y-5 h-fit shadow-sm">
          <div className="flex items-center justify-between border-b border-gs-border pb-3">
            <h3 className="text-xs font-bold text-gs-text uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-gs-text" /> Filters
            </h3>
          </div>

          {/* Game Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-gs-faint font-medium">In-Game Item</label>
            <div className="relative">
              <select className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2 text-xs font-semibold text-gs-text focus:outline-none focus:border-gs-text cursor-pointer">
                <option>Counter-Strike 2</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
            </div>
          </div>

          {/* Search Query Input */}
          <div className="space-y-1.5">
            <label className="text-xs text-gs-faint font-medium">Filter Results...</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter results..."
                className="w-full bg-gs-surface-2 border border-gs-border rounded-xl pl-9 pr-3 py-2 text-xs text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-text transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gs-faint hover:text-gs-text"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-[11px] text-gs-muted cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeDescription}
                onChange={(e) => setIncludeDescription(e.target.checked)}
                className="rounded border-gs-border"
              />
              Include descriptions in search
            </label>
          </div>

          {/* Weapon Categories Accordion / List */}
          <div className="space-y-1.5">
            <label className="text-xs text-gs-faint font-medium">Category</label>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {WEAPON_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                    category === cat.id
                      ? 'bg-gs-text text-gs-bg font-bold shadow-sm'
                      : 'text-gs-muted hover:text-gs-text hover:bg-gs-surface-2 border border-transparent'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] font-mono ${category === cat.id ? 'text-gs-bg/80' : 'text-gs-faint'}`}>{cat.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-gs-faint font-medium">Price Range (USD)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2 text-xs text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-text"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2 text-xs text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-text"
              />
            </div>
          </div>

          {/* Exterior Wear Condition Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-gs-faint font-medium">Exterior / Wear</label>
            <div className="relative">
              <select
                value={exterior}
                onChange={(e) => setExterior(e.target.value)}
                className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2 text-xs text-gs-text font-medium focus:outline-none focus:border-gs-text cursor-pointer"
              >
                {EXTERIORS.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
            </div>
          </div>

          {/* Quality Selector (StatTrak / Souvenir / Normal) */}
          <div className="space-y-1.5">
            <label className="text-xs text-gs-faint font-medium">Quality</label>
            <div className="grid grid-cols-2 gap-1.5">
              {QUALITIES.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setQuality(q.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    quality === q.id
                      ? 'bg-gs-text text-gs-bg font-bold shadow-sm'
                      : 'bg-gs-surface-2 text-gs-muted hover:text-gs-text border border-gs-border'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearch('');
              setCategory('all');
              setExterior('all');
              setQuality('all');
              setMinPrice('');
              setMaxPrice('');
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gs-surface-2 border border-gs-border text-gs-muted hover:text-gs-text hover:border-gs-faint transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-3.5" /> Reset Filters
          </button>
        </aside>

        {/* Main Content Area */}
        <div className="space-y-4">
          {/* Top Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gs-surface border border-gs-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-gs-faint font-semibold flex-wrap">
              <span>Found <strong className="text-gs-text font-bold">{totalCount.toLocaleString()}</strong> results for:</span>
              <span className="px-2.5 py-1 rounded-lg bg-gs-surface-2 text-gs-text border border-gs-border font-medium">
                {selectedCategoryLabel}
              </span>
              {search && (
                <span className="px-2.5 py-1 rounded-lg bg-gs-surface-2 text-gs-text border border-gs-border flex items-center gap-1">
                  "{search}" <X className="size-3 cursor-pointer" onClick={() => setSearch('')} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gs-faint font-medium">Sort by:</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none bg-gs-surface-2 border border-gs-border rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-gs-text focus:outline-none focus:border-gs-text cursor-pointer"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Main Item Cards Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gs-faint">
              <RefreshCw className="size-8 animate-spin text-gs-text" />
              <p className="text-sm font-medium">Connecting to Steam Market...</p>
            </div>
          ) : error ? (
            <div className="bg-gs-surface border border-gs-border rounded-2xl p-12 text-center space-y-3">
              <p className="text-gs-text font-semibold">{error}</p>
              <button
                onClick={() => setCategory('all')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gs-text text-gs-bg"
              >
                Try Again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-gs-surface border border-gs-border rounded-2xl p-12 text-center space-y-3">
              <Eye className="size-10 text-gs-faint mx-auto" />
              <p className="text-gs-text font-semibold">No items found</p>
              <p className="text-xs text-gs-faint">Try adjusting your search terms or category filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className="bg-gs-surface border border-gs-border hover:border-gs-faint/60 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
                  >
                    {/* Category & Title */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-gs-faint uppercase truncate">
                        {item.type || 'CS2 Item'}
                      </p>
                      <h3
                        className="text-xs font-bold text-gs-text truncate leading-snug"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                    </div>

                    {/* Weapon Render Image */}
                    <div className="relative my-3 h-32 bg-gs-surface-2 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-gs-border">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                      {item.stattrak && (
                        <span className="absolute top-2 left-2 bg-gs-text text-gs-bg text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                          StatTrak™
                        </span>
                      )}
                    </div>

                    {/* Footer: Quantity Listed & Price */}
                    <div className="space-y-1 pt-2 border-t border-gs-border">
                      <p className="text-[11px] text-gs-faint">
                        Quantity listed: <strong className="text-gs-text">{item.sell_listings.toLocaleString()}</strong>
                      </p>
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-xs font-bold text-gs-text tabular-nums">
                          {item.formatted_usd}
                        </span>
                        <span className="text-[11px] text-gs-faint font-mono">
                          From {item.formatted_vnd}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Pagination Button */}
              {items.length < totalCount && (
                <div className="flex flex-col items-center justify-center pt-6 pb-2 space-y-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-gs-surface border border-gs-border hover:bg-gs-surface-2 text-gs-text shadow-sm hover:border-gs-faint transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" /> Loading more CS2 items...
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" /> Load More Items ({items.length} of {totalCount.toLocaleString()})
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gs-faint">Showing {items.length} of {totalCount.toLocaleString()} CS2 market items</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3RD SCREENSHOT ITEM DETAIL VIEW MODAL (ENGLISH WEB UI THEME)
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedMarketItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedMarketItem(null)}
        >
          <div
            className="bg-gs-surface border border-gs-border rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-gs-border bg-gs-surface sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedMarketItem(null)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gs-surface-2 border border-gs-border text-gs-muted hover:text-gs-text transition-all"
                >
                  <ArrowLeft className="size-4" /> Back to Market
                </button>
                <div className="h-5 w-px bg-gs-border" />
                <div>
                  <p className="text-[11px] text-gs-faint font-semibold uppercase tracking-wider">
                    Weekly sales: <span className="text-gs-text font-bold">{detailWeeklySales}</span>
                  </p>
                  <h2 className="text-base font-bold text-gs-text leading-tight">
                    Found {filteredDetailListings.length} listings for: {selectedMarketItem.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-gs-muted cursor-pointer bg-gs-surface-2 px-3 py-1.5 rounded-xl border border-gs-border">
                  <input type="checkbox" className="rounded border-gs-border" defaultChecked />
                  Show profitability of lots
                </label>
                <label className="flex items-center gap-2 text-xs text-gs-muted cursor-pointer bg-gs-surface-2 px-3 py-1.5 rounded-xl border border-gs-border">
                  <input type="checkbox" className="rounded border-gs-border" defaultChecked />
                  Skin details
                </label>
                <div className="relative">
                  <select
                    value={detailSort}
                    onChange={(e) => setDetailSort(e.target.value)}
                    className="appearance-none bg-gs-surface-2 border border-gs-border rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-gs-text focus:outline-none cursor-pointer"
                  >
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="float_asc">Float: Low to High</option>
                    <option value="float_desc">Float: High to Low</option>
                    <option value="pattern">Pattern Seed</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
                </div>
                <button
                  onClick={() => setSelectedMarketItem(null)}
                  className="p-1.5 rounded-lg text-gs-faint hover:text-gs-text hover:bg-gs-surface-2 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
              {/* Left Filters Panel */}
              <aside className="bg-gs-surface-2 border border-gs-border rounded-2xl p-4 space-y-4 h-fit">
                <h3 className="text-xs font-bold text-gs-text uppercase tracking-wider border-b border-gs-border pb-2.5 flex items-center gap-2">
                  <Filter className="size-3.5 text-gs-text" /> Filter Listings
                </h3>

                {/* Custom Search Text */}
                <div className="space-y-1">
                  <label className="text-[11px] text-gs-faint font-medium">Custom Filter (Pattern / Float)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint" />
                    <input
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      placeholder="Enter pattern or float..."
                      className="w-full bg-gs-surface border border-gs-border rounded-xl pl-9 pr-3 py-2 text-xs text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-text"
                    />
                  </div>
                </div>

                {/* Price Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] text-gs-faint font-medium">Price (USD)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min Price"
                      value={detailMinPrice}
                      onChange={(e) => setDetailMinPrice(e.target.value)}
                      className="bg-gs-surface border border-gs-border rounded-xl px-2.5 py-1.5 text-xs text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-text"
                    />
                    <input
                      type="number"
                      placeholder="Max Price"
                      value={detailMaxPrice}
                      onChange={(e) => setDetailMaxPrice(e.target.value)}
                      className="bg-gs-surface border border-gs-border rounded-xl px-2.5 py-1.5 text-xs text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-text"
                    />
                  </div>
                </div>

                {/* Float Range Filter Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gs-faint font-medium">Float Range</span>
                    <span className="text-gs-text font-bold tabular-nums">
                      {detailMinFloat.toFixed(3)} - {detailMaxFloat.toFixed(3)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={detailMinFloat}
                      onChange={(e) => setDetailMinFloat(parseFloat(e.target.value) || 0)}
                      className="bg-gs-surface border border-gs-border rounded-xl px-2 py-1 text-xs text-gs-text focus:outline-none focus:border-gs-text"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={detailMaxFloat}
                      onChange={(e) => setDetailMaxFloat(parseFloat(e.target.value) || 1)}
                      className="bg-gs-surface border border-gs-border rounded-xl px-2 py-1 text-xs text-gs-text focus:outline-none focus:border-gs-text"
                    />
                  </div>
                  <FloatBar floatVal={(detailMinFloat + detailMaxFloat) / 2} />
                </div>

                {/* Quality buttons */}
                <div className="space-y-1">
                  <label className="text-[11px] text-gs-faint font-medium">Quality</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'normal', label: 'Normal' },
                      { id: 'stattrak', label: 'StatTrak™' },
                      { id: 'souvenir', label: 'Souvenir' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setDetailQuality(q.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                          detailQuality === q.id
                            ? 'bg-gs-text text-gs-bg font-bold shadow-sm'
                            : 'bg-gs-surface text-gs-muted hover:text-gs-text border border-gs-border'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessories checkboxes */}
                <div className="space-y-2 border-t border-gs-border pt-3">
                  <p className="text-[11px] font-medium text-gs-faint">Attached Accessories</p>
                  <label className="flex items-center gap-2 text-xs text-gs-muted cursor-pointer hover:text-gs-text">
                    <input
                      type="checkbox"
                      checked={detailRequireCharm}
                      onChange={(e) => setDetailRequireCharm(e.target.checked)}
                      className="rounded border-gs-border"
                    />
                    With Charms
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gs-muted cursor-pointer hover:text-gs-text">
                    <input
                      type="checkbox"
                      checked={detailRequireSticker}
                      onChange={(e) => setDetailRequireSticker(e.target.checked)}
                      className="rounded border-gs-border"
                    />
                    With Stickers
                  </label>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    setDetailSearch('');
                    setDetailMinPrice('');
                    setDetailMaxPrice('');
                    setDetailMinFloat(0);
                    setDetailMaxFloat(1);
                    setDetailQuality('all');
                    setDetailRequireSticker(false);
                    setDetailRequireCharm(false);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-gs-surface border border-gs-border text-gs-muted hover:text-gs-text transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="size-3.5" /> Reset Filters
                </button>
              </aside>

              {/* Right Individual Listings Grid */}
              <div className="space-y-4">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-gs-faint">
                    <RefreshCw className="size-8 animate-spin text-gs-text" />
                    <p className="text-sm font-medium">Loading market listings...</p>
                  </div>
                ) : filteredDetailListings.length === 0 ? (
                  <div className="bg-gs-surface border border-gs-border rounded-2xl p-12 text-center space-y-3">
                    <Tag className="size-10 text-gs-faint mx-auto" />
                    <p className="text-gs-text font-semibold">No matching listings found</p>
                    <p className="text-xs text-gs-faint">Try adjusting your filters or float range.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDetailListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="bg-gs-surface border border-gs-border hover:border-gs-faint/60 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group shadow-sm"
                      >
                        {/* Title */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-gs-faint uppercase tracking-wide truncate">
                            {listing.wear || 'CS2 Item'}
                          </p>
                          <h4 className="text-xs font-bold text-gs-text truncate leading-snug" title={listing.title}>
                            {listing.title}
                          </h4>
                        </div>

                        {/* Image Preview */}
                        <div className="relative my-3 h-28 bg-gs-surface-2 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-gs-border">
                          <ImageWithFallback
                            src={listing.image || selectedMarketItem.image}
                            alt={listing.title}
                            className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                          />
                          {listing.stattrak && (
                            <span className="absolute top-2 left-2 bg-gs-text text-gs-bg text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                              StatTrak™
                            </span>
                          )}
                        </div>

                        {/* Pattern & Float metadata (only for weapon skins) */}
                        {!listing.title.toLowerCase().includes('case') &&
                        !listing.title.toLowerCase().includes('container') &&
                        !listing.title.toLowerCase().includes('capsule') &&
                        !listing.title.toLowerCase().includes('sticker') &&
                        !listing.title.toLowerCase().includes('key') && (
                          <div className="space-y-1 text-[11px] text-gs-faint border-t border-gs-border pt-2">
                            <div className="flex justify-between font-mono">
                              <span>Pattern template: <strong className="text-gs-text">{listing.pattern}</strong></span>
                            </div>
                            <div className="flex justify-between font-mono">
                              <span>Float: <strong className="text-gs-text">{listing.float.toFixed(8)}</strong></span>
                            </div>

                            {/* Float Spectrum Bar */}
                            <FloatBar floatVal={listing.float} />
                          </div>
                        )}

                        {/* Stickers & Charms Badges */}
                        {(listing.stickers.length > 0 || listing.charms.length > 0) && (
                          <div className="flex gap-1 flex-wrap pt-2 border-t border-gs-border">
                            {listing.stickers.map((st, i) => (
                              <span key={i} className="text-[9px] bg-gs-surface-2 text-gs-text border border-gs-border px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                🏷️ {st}
                              </span>
                            ))}
                            {listing.charms.map((ch, i) => (
                              <span key={i} className="text-[9px] bg-gs-surface-2 text-gs-text border border-gs-border px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                🧸 {ch}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price & Buy Button */}
                        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gs-border">
                          <div>
                            <p className="text-sm font-bold text-gs-text tabular-nums">{listing.formatted_usd}</p>
                            <p className="text-[11px] text-gs-faint font-mono">{listing.formatted_vnd}</p>
                          </div>
                          <button
                            onClick={(e) =>
                              handleAddToCart(
                                e,
                                listing.title,
                                listing.price_usd,
                                listing.image || selectedMarketItem.image,
                                listing.id
                              )
                            }
                            disabled={addingId === listing.id}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-gs-text text-gs-bg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm"
                          >
                            {addingId === listing.id ? '...' : 'Buy'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

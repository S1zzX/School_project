import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, ShieldCheck, ChevronDown, X, Trash2,
  Package, TrendingUp, Star, ShoppingCart, Layers,
  CheckCircle2, Filter, Eye, Crown, Store as StoreIcon,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  apiGetStoreListings, apiCreateStoreListing, apiAdminDeleteStoreListing, apiDeleteMyListing, apiAddToCart,
  apiIncrementListingView,
  StoreListingAPI, getUser, type UserRole,
} from '../lib/api';
import { Link, useNavigate } from 'react-router';

const GAMES = ['All', 'LoL', 'CS2', 'Valorant'];
const GAME_FILTER_INLINE_MAX = 5;
const SORT  = ['Recent', 'Price: Low', 'Price: High', 'Popular'];

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'danger' }) {
  const styles = {
    default: 'bg-gs-surface-2 text-gs-muted border-gs-border',
    success: 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    danger:  'bg-red-500/8 text-red-600 dark:text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

function StatStrip({ items }: { items: { label: string; value: string | number; icon: React.ReactNode }[] }) {
  return (
    <div className="bg-gs-surface border border-gs-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gs-border">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-lg bg-gs-surface-2 flex items-center justify-center text-gs-muted shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gs-text tabular-nums leading-none">{item.value}</p>
              <p className="text-[11px] text-gs-faint font-medium mt-1">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, { label: string; variant: 'success' | 'danger' | 'default' }> = {
  available: { label: 'In Stock', variant: 'success' },
  sold:      { label: 'Sold Out', variant: 'danger'  },
  reserved:  { label: 'Reserved', variant: 'default' },
};

function filterBtnClass(active: boolean) {
  return active
    ? 'px-3 py-2 rounded-lg text-sm font-medium text-gs-text bg-gs-surface-2 border border-gs-accent/30'
    : 'px-3 py-2 rounded-lg text-sm font-medium text-gs-muted hover:text-gs-text border border-transparent hover:bg-gs-surface-2';
}

type ViewMode   = 'grid' | 'list';
type FilterType = 'all' | 'skin' | 'account';

function SellerAdminBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded font-medium uppercase bg-gs-surface-2 text-gs-muted border border-gs-border">
      <Crown className="size-2 shrink-0" strokeWidth={2.5} />
    </span>
  );
}

function SellerLine({ name, role, size = 'xs' }: { name: string; role?: UserRole; size?: 'sm' | 'xs' }) {
  const resolvedRole = role ?? (name.toLowerCase() === 'admin' ? 'admin' as UserRole : undefined);
  const textSize = size === 'sm' ? 'text-xs' : 'text-[10px]';
  return (
    <div className={`flex items-center gap-1 flex-wrap min-w-0 ${textSize} text-gs-muted`}>
      <span className="font-medium truncate">{name}</span>
      {resolvedRole === 'admin' && <SellerAdminBadge />}
    </div>
  );
}

export function Store() {
  const navigate = useNavigate();
  const user     = getUser();

  const [listings,    setListings]    = useState<StoreListingAPI[]>([]);
  const [gameFilter,  setGameFilter]  = useState('All');
  const [typeFilter,  setTypeFilter]  = useState<FilterType>('all');
  const [sort,        setSort]        = useState('Recent');
  const [search,      setSearch]      = useState('');
  const [viewMode,    setViewMode]    = useState<ViewMode>('grid');
  const [showModal,   setShowModal]   = useState(false);
  const [showGameFilterModal, setShowGameFilterModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<StoreListingAPI | null>(null);

  // Form state
  const [newGameType, setNewGameType] = useState('CS2 — Skin / Item');
  const [newName,     setNewName]     = useState('');
  const [newPrice,    setNewPrice]    = useState('');
  const [newDetails,  setNewDetails]  = useState('');
  const [newRank,     setNewRank]     = useState('Unranked');
  const [newHours,    setNewHours]    = useState('');
  const [newSkins,    setNewSkins]    = useState('');
  const [newChamps,   setNewChamps]   = useState('');
  const [newLevel,    setNewLevel]    = useState('');
  const [newWear,     setNewWear]     = useState('Factory New');
  const [newFloat,    setNewFloat]    = useState('');
  const [newStock,    setNewStock]    = useState('1');
  const [newImage,    setNewImage]    = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  const [cartToast,    setCartToast]    = useState<string | null>(null);

  useEffect(() => {
    apiGetStoreListings().then(setListings).catch(console.error);
  }, []);

  // Track a view when a listing detail is opened (feeds live analytics)
  useEffect(() => {
    if (!selectedListing) return;
    const listingId = selectedListing.id;
    apiIncrementListingView(listingId)
      .then(({ views }) => {
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, views } : l));
        setSelectedListing(prev => (prev?.id === listingId ? { ...prev, views } : prev));
      })
      .catch(() => {});
  }, [selectedListing?.id]);

  const availableGames = useMemo(() => {
    const fromListings = Array.from(new Set(listings.map(l => l.game).filter(Boolean))).sort();
    const merged = new Set(['All', ...GAMES.slice(1), ...fromListings]);
    return Array.from(merged);
  }, [listings]);

  const useGameFilterModal = availableGames.length > GAME_FILTER_INLINE_MAX;

  useEffect(() => {
    if (gameFilter !== 'All' && !availableGames.includes(gameFilter)) {
      setGameFilter('All');
    }
  }, [availableGames, gameFilter]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setNewImage(null); return; }
    const reader = new FileReader();
    reader.onload = () => setNewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setNewName(''); setNewPrice(''); setNewDetails(''); setNewImage(null);
    setNewGameType('CS2 — Skin / Item'); setNewRank('Unranked'); setNewHours('');
    setNewSkins(''); setNewChamps(''); setNewLevel(''); setNewWear('Factory New');
    setNewFloat(''); setNewStock('1');
  };

  const handlePostListing = async () => {
    if (!user) { navigate('/login'); return; }
    if (!newName || !newPrice) return;
    setSubmitting(true);

    let listingData: Partial<StoreListingAPI>;

    if (newGameType.startsWith('CS2')) {
      listingData = {
        type: 'skin', game: 'CS2', item: newName, category: 'Skin',
        wear: newWear, float: newFloat || '0.000',
        price: parseFloat(newPrice) || 0,
        stock: parseInt(newStock) || 1,
        description: newDetails || undefined,
        image: newImage || 'https://via.placeholder.com/400?text=No+Image',
      };
    } else {
      const isVal = newGameType.startsWith('Valorant');
      listingData = {
        type: 'account', game: isVal ? 'Valorant' : 'LoL',
        rank: newRank, hoursPlayed: parseInt(newHours) || 0,
        skinsOwned: parseInt(newSkins) || 0,
        championsOwned: parseInt(newChamps) || 0,
        level: parseInt(newLevel) || 0,
        highlight: newName,
        description: newDetails || undefined,
        price: parseFloat(newPrice) || 0,
        stock: parseInt(newStock) || 1,
        image: newImage || 'https://via.placeholder.com/400?text=No+Image',
      };
    }

    try {
      const saved = await apiCreateStoreListing(listingData);
      setListings(prev => [saved, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDeleteListing = async (e: React.MouseEvent, item: StoreListingAPI) => {
    e.stopPropagation();
    if (!confirm('Delete this listing?')) return;
    try {
      if (user?.role === 'admin') {
        await apiAdminDeleteStoreListing(item.id);
      } else {
        await apiDeleteMyListing(item.id);
      }
      setListings(prev => prev.filter(l => l.id !== item.id));
      if (selectedListing?.id === item.id) setSelectedListing(null);
    } catch { alert('Failed to delete.'); }
  };

  const canDeleteListing = (item: StoreListingAPI) =>
    user?.role === 'admin' || Number(item.user_id) === Number(user?.id);

  const handleAddToCart = async (e: React.MouseEvent, item: StoreListingAPI) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (item.status === 'sold') return;
    setAddingToCart(prev => ({ ...prev, [item.id]: true }));
    try {
      await apiAddToCart({
        item_id: `store_${item.id}`,
        name: item.type === 'skin' ? item.item! : item.highlight || `${item.game} Account`,
        game: item.game, game_color: '#eef3fb',
        type: item.type === 'skin' ? 'Skin' : 'Account', platform: 'PC',
        price: item.price, original_price: null, image: item.image,
      });
      setCartToast(item.type === 'skin' ? item.item! : item.highlight || `${item.game} Account`);
      setTimeout(() => setCartToast(null), 3000);
      setSelectedListing(null);
    } catch { alert('Failed to add to cart.'); }
    finally { setAddingToCart(prev => ({ ...prev, [item.id]: false })); }
  };

  const filtered = listings
    .filter(l => gameFilter === 'All' || l.game === gameFilter)
    .filter(l => typeFilter === 'all' || l.type === typeFilter)
    .filter(l => {
      const q = search.toLowerCase();
      return l.type === 'skin'
        ? (l.item || '').toLowerCase().includes(q) || l.game.toLowerCase().includes(q)
        : l.game.toLowerCase().includes(q) || (l.highlight || '').toLowerCase().includes(q) || (l.rank || '').toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sort === 'Price: Low'  ? a.price - b.price :
      sort === 'Price: High' ? b.price - a.price :
      sort === 'Popular'     ? b.views - a.views : 0
    );

  const totalAvailable = listings.filter(l => l.status !== 'sold').length;
  const totalSold      = listings.filter(l => l.status === 'sold').length;

  const WEAR_OPTIONS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
  const RANK_OPTIONS = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* Cart toast */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-gs-border bg-gs-surface shadow-lg">
          <CheckCircle2 className="size-4 text-gs-muted shrink-0" />
          <div>
            <p className="text-sm font-medium text-gs-text">Added to cart</p>
            <p className="text-xs text-gs-faint">{cartToast}</p>
          </div>
          <Link to="/cart" className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gs-accent text-white hover:opacity-90">
            View Cart
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gs-surface-2 border border-gs-border flex items-center justify-center text-gs-muted">
            <StoreIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gs-text tracking-tight">Player Store</h1>
            <p className="text-sm text-gs-faint mt-0.5">Community marketplace — skins, accounts, and exclusive items</p>
          </div>
        </div>
        {(!user || user.role === 'shop_owner' || user.role === 'admin') && (
          <button
            onClick={() => user ? setShowModal(true) : navigate('/login')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="size-4" /> Post Listing
          </button>
        )}
      </div>

      {/* Stats */}
      <StatStrip items={[
        { label: 'Total Listings', value: listings.length, icon: <Layers className="size-4" /> },
        { label: 'Available Now', value: totalAvailable, icon: <Package className="size-4" /> },
        { label: 'Total Sold', value: totalSold, icon: <TrendingUp className="size-4" /> },
        { label: 'Active Sellers', value: new Set(listings.map(l => l.seller)).size, icon: <Star className="size-4" /> },
      ]} />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-44 max-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="w-full bg-gs-surface border border-gs-border rounded-lg pl-9 pr-3 py-2 text-gs-text placeholder:text-gs-faint focus:outline-none focus:border-gs-accent/40 text-sm"
            />
          </div>

          <div className="relative">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="appearance-none bg-gs-surface border border-gs-border rounded-lg pl-3 pr-8 py-2 text-gs-muted text-sm focus:outline-none cursor-pointer">
              {SORT.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
          </div>

          <div className="flex gap-1 bg-gs-surface border border-gs-border rounded-lg p-1">
            {([
              { mode: 'grid' as const, icon: <Layers className="size-3.5" /> },
              { mode: 'list' as const, icon: <Filter className="size-3.5" /> },
            ]).map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)}
                className={`p-1.5 rounded transition-colors ${viewMode === v.mode ? 'bg-gs-surface-2 text-gs-text' : 'text-gs-faint hover:text-gs-muted'}`}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 flex-wrap items-center">
            {useGameFilterModal ? (
              <>
                <button onClick={() => setGameFilter('All')} className={filterBtnClass(gameFilter === 'All')}>All</button>
                {gameFilter !== 'All' && (
                  <span className={filterBtnClass(true)}>{gameFilter}</span>
                )}
                <button
                  onClick={() => setShowGameFilterModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gs-muted hover:text-gs-text border border-gs-border hover:bg-gs-surface-2 transition-colors"
                >
                  <Filter className="size-3.5" />
                  {gameFilter === 'All' ? `Games (${availableGames.length - 1})` : 'Change game'}
                </button>
              </>
            ) : (
              availableGames.map(g => (
                <button key={g} onClick={() => setGameFilter(g)} className={filterBtnClass(gameFilter === g)}>
                  {g}
                </button>
              ))
            )}
          </div>

          <span className="hidden sm:block w-px h-5 bg-gs-border" />

          <div className="flex gap-1">
            {(['all', 'skin', 'account'] as FilterType[]).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={filterBtnClass(typeFilter === t)}>
                {t === 'all' ? 'All Types' : t === 'skin' ? 'Skins' : 'Accounts'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gs-faint">{filtered.length} listing{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* ── LISTINGS ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gs-surface-2 border border-gs-border">
            <Package className="size-7 text-gs-faint" />
          </div>
          <p className="text-gs-text font-semibold">No listings found</p>
          {user?.role === 'gamer' ? (
            <p className="text-gs-faint text-sm max-w-xs">No items match your filters. Try adjusting your search or check back soon.</p>
          ) : (
            <>
              <p className="text-gs-faint text-sm max-w-xs">Be the first! Post a CS2 skin or a LoL / Valorant account to the community store.</p>
              <button onClick={() => user ? setShowModal(true) : navigate('/login')}
                className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity">
                <Plus className="size-4" /> Post a Listing
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // GRID VIEW
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => {
            const isSold = item.status === 'sold';
            const statusInfo = STATUS_STYLE[item.status || 'available'] ?? STATUS_STYLE.available;
            return (
              <div key={item.id} onClick={() => setSelectedListing(item)}
                className={`bg-gs-surface border border-gs-border rounded-xl overflow-hidden group cursor-pointer transition-all hover:border-gs-accent/25 ${isSold ? 'opacity-60' : ''}`}>

                <div className="relative h-36 overflow-hidden bg-gs-surface-2">
                  <ImageWithFallback src={item.image} alt={item.type === 'skin' ? item.item! : item.game}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    <Badge>{item.type === 'skin' ? 'Skin' : 'Account'}</Badge>
                    {item.type === 'account' && item.rank && (
                      <Badge>{item.rank}</Badge>
                    )}
                    {item.type === 'skin' && (
                      <Badge>Middleman</Badge>
                    )}
                  </div>

                  {isSold && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-xs font-semibold text-gs-text bg-gs-surface/90 px-3 py-1 rounded-md border border-gs-border">Sold</span>
                    </div>
                  )}

                  {canDeleteListing(item) && (
                    <button onClick={e => handleDeleteListing(e, item)}
                      className="absolute top-2 right-2 z-10 bg-black/70 text-gs-faint hover:text-red-400 p-1.5 rounded-md border border-gs-border transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  {item.type === 'skin' ? (
                    <>
                      <p className="text-gs-text text-sm font-semibold truncate leading-tight">{item.item}</p>
                      <SellerLine name={item.seller} role={item.seller_role} />
                      <div className="flex items-center justify-between text-xs text-gs-faint">
                        <span>{item.wear}</span>
                        <span>float {item.float}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gs-text text-sm font-semibold truncate leading-tight">{item.highlight}</p>
                      <SellerLine name={item.seller} role={item.seller_role} />
                      <div className="flex items-center gap-1.5 text-xs text-gs-faint">
                        <span>{item.hoursPlayed}h</span>
                        <span>·</span>
                        <span>{item.skinsOwned} skins</span>
                        {item.championsOwned ? <><span>·</span><span>{item.championsOwned} champs</span></> : null}
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-1.5 text-xs">
                    {item.stock && item.stock > 1 ? (
                      <Badge variant="success">{item.stock} in stock</Badge>
                    ) : (
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    )}
                    {(item.order_count ?? 0) > 0 && (
                      <span className="text-gs-faint flex items-center gap-0.5"><TrendingUp className="size-3" />{item.order_count}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gs-border">
                    <div>
                      <p className="text-gs-text font-bold text-base tabular-nums">${item.price.toLocaleString()}</p>
                      <p className="text-[10px] text-gs-faint mt-0.5">{item.sellerRating?.toFixed(1) || '5.0'} seller rating</p>
                    </div>
                    <button onClick={e => handleAddToCart(e, item)} disabled={addingToCart[item.id] || isSold}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 ${
                        isSold ? 'bg-gs-surface-2 text-gs-faint' : 'bg-gs-accent text-white hover:opacity-90'
                      }`}>
                      {isSold ? 'Sold' : addingToCart[item.id] ? '...' : item.type === 'skin' ? 'Trade' : 'Buy'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // LIST VIEW
        <div className="bg-gs-surface border border-gs-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gs-border">
                {['Item', 'Game', 'Type', 'Details', 'Stock', 'Orders', 'Price', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gs-faint">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isSold = item.status === 'sold';
                const statusInfo = STATUS_STYLE[item.status || 'available'] ?? STATUS_STYLE.available;
                return (
                  <tr key={item.id} onClick={() => setSelectedListing(item)}
                    className={`border-b border-gs-border last:border-0 hover:bg-gs-surface-2/60 cursor-pointer transition-colors ${isSold ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gs-surface-2 shrink-0 border border-gs-border">
                          <ImageWithFallback src={item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gs-text truncate">{item.type === 'skin' ? item.item : item.highlight || `${item.game} Account`}</p>
                          <SellerLine name={item.seller} role={item.seller_role} />
                          <p className="text-xs text-gs-faint mt-0.5">{item.type === 'skin' ? item.wear : item.rank}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge>{item.game}</Badge></td>
                    <td className="px-5 py-4 text-xs text-gs-muted capitalize">{item.type}</td>
                    <td className="px-5 py-4 text-xs text-gs-faint">
                      {item.type === 'skin' ? `Float: ${item.float}` : `${item.hoursPlayed}h · ${item.skinsOwned} skins`}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusInfo.variant}>
                        {item.stock && item.stock > 1 ? `${item.stock} left` : statusInfo.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-gs-muted tabular-nums">
                      <span className="flex items-center gap-1"><TrendingUp className="size-3 text-gs-faint" />{item.order_count ?? 0}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-gs-text tabular-nums">${item.price.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={e => handleAddToCart(e, item)} disabled={addingToCart[item.id] || isSold}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 ${
                            isSold ? 'bg-gs-surface-2 text-gs-faint' : 'bg-gs-accent text-white hover:opacity-90'
                          }`}>
                          <ShoppingCart className="size-3" />{isSold ? 'Sold' : 'Buy'}
                        </button>
                        <button onClick={() => setSelectedListing(item)}
                          className="p-1.5 rounded-lg hover:bg-gs-surface-2 text-gs-faint hover:text-gs-text transition-colors" title="View details">
                          <Eye className="size-3.5" />
                        </button>
                        {canDeleteListing(item) && (
                          <button onClick={e => handleDeleteListing(e, item)}
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-gs-faint hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── POST MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gs-surface border border-gs-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gs-border sticky top-0 bg-gs-surface z-10">
              <h2 className="text-base font-bold text-gs-text">Post a Listing</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gs-faint hover:text-gs-text w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gs-surface-2 transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gs-surface-2 border border-gs-border rounded-xl p-3 text-xs text-gs-muted">
                <strong className="text-gs-text">Note:</strong> CS2 skins can be listed as items. For LoL and Valorant, list accounts only.
              </div>

              <div>
                <label className="text-xs text-gs-muted block mb-1.5 font-medium">Game & Listing Type *</label>
                <div className="relative">
                  <select value={newGameType} onChange={e => setNewGameType(e.target.value)}
                    className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 pr-8 py-2.5 text-gs-text text-sm focus:outline-none focus:border-gs-accent/50">
                    <option>CS2 — Skin / Item</option>
                    <option>Valorant — Account</option>
                    <option>League of Legends — Account</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gs-muted block mb-1.5 font-medium">{newGameType.startsWith('CS2') ? 'Skin Name *' : 'Account Name / Highlight *'}</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder={newGameType.startsWith('CS2') ? 'e.g. Karambit | Fade' : 'e.g. Immortal 2 Main Account'}
                  className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
              </div>

              {/* CS2-specific fields */}
              {newGameType.startsWith('CS2') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gs-muted block mb-1.5 font-medium">Wear Condition</label>
                    <div className="relative">
                      <select value={newWear} onChange={e => setNewWear(e.target.value)}
                        className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 pr-8 py-2.5 text-gs-text text-sm focus:outline-none focus:border-gs-accent/50">
                        {WEAR_OPTIONS.map(w => <option key={w}>{w}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gs-muted block mb-1.5 font-medium">Float Value</label>
                    <input value={newFloat} onChange={e => setNewFloat(e.target.value)} placeholder="0.0123"
                      className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                  </div>
                </div>
              )}

              {/* Account-specific fields */}
              {!newGameType.startsWith('CS2') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gs-muted block mb-1.5 font-medium">Rank</label>
                      <div className="relative">
                        <select value={newRank} onChange={e => setNewRank(e.target.value)}
                          className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 pr-8 py-2.5 text-gs-text text-sm focus:outline-none focus:border-gs-accent/50">
                          {RANK_OPTIONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gs-muted block mb-1.5 font-medium">Account Level</label>
                      <input type="number" value={newLevel} onChange={e => setNewLevel(e.target.value)} placeholder="e.g. 150"
                        className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gs-muted block mb-1.5 font-medium">Hours Played</label>
                      <input type="number" value={newHours} onChange={e => setNewHours(e.target.value)} placeholder="0"
                        className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gs-muted block mb-1.5 font-medium">Skins Owned</label>
                      <input type="number" value={newSkins} onChange={e => setNewSkins(e.target.value)} placeholder="0"
                        className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                    </div>
                    {newGameType.includes('League') && (
                      <div>
                        <label className="text-xs text-gs-muted block mb-1.5 font-medium">Champions</label>
                        <input type="number" value={newChamps} onChange={e => setNewChamps(e.target.value)} placeholder="0"
                          className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gs-muted block mb-1.5 font-medium">Price (USD) *</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00"
                    className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                </div>
                <div>
                  <label className="text-xs text-gs-muted block mb-1.5 font-medium">Stock Quantity</label>
                  <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="1" min={1}
                    className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gs-muted block mb-1.5 font-medium">Description / Details</label>
                <textarea rows={3} value={newDetails} onChange={e => setNewDetails(e.target.value)}
                  placeholder="Additional details, notable items, achievements, etc."
                  className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2.5 text-gs-text placeholder-gs-faint text-sm focus:outline-none focus:border-gs-accent/50 resize-none" />
              </div>

              <div>
                <label className="text-xs text-gs-muted block mb-1.5 font-medium">Cover Image (optional)</label>
                <input type="file" accept="image/*" onChange={handleImageChange}
                  className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-3 py-2 text-gs-text text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gs-surface file:text-gs-text hover:file:bg-gs-border transition-all cursor-pointer" />
                {newImage && <img src={newImage} alt="Preview" className="mt-2 h-16 rounded-xl border border-gs-border object-cover" />}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 border border-gs-border text-gs-muted py-3 rounded-xl text-sm hover:bg-gs-surface-2 transition-colors font-semibold">Cancel</button>
                <button disabled={submitting || !newName || !newPrice} onClick={handlePostListing}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                  {submitting ? 'Posting...' : 'Post Listing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTING DETAIL MODAL ── */}
      {selectedListing && (() => {
        const sl = selectedListing;
        const isSkin    = sl.type === 'skin';
        const isSold    = sl.status === 'sold';
        const stock     = sl.stock ?? 1;
        const orders    = sl.order_count ?? 0;
        const wearColor = 'text-gs-text';
        const title     = isSkin ? sl.item : sl.highlight || `${sl.game} Account`;
        const hasNotes  = Boolean(sl.description?.trim());
        const sellerNotes = hasNotes
          ? sl.description!.trim()
          : buildListingNotes(sl);

        const specs: { label: string; value: string; highlight?: boolean }[] = isSkin
          ? [
              { label: 'Game', value: sl.game },
              { label: 'Wear', value: sl.wear || '—', highlight: true },
              { label: 'Float', value: sl.float || '—' },
              ...(sl.category ? [{ label: 'Type', value: sl.category }] : []),
              { label: 'Stock', value: isSold ? 'Sold out' : `${stock} left` },
              { label: 'Orders', value: String(orders) },
            ]
          : [
              { label: 'Game', value: sl.game },
              { label: 'Rank', value: sl.rank || 'Unranked' },
              { label: 'Hours', value: `${sl.hoursPlayed || 0}h` },
              { label: 'Skins', value: String(sl.skinsOwned ?? 0) },
              ...(sl.level ? [{ label: 'Level', value: String(sl.level) }] : []),
              ...(sl.championsOwned != null ? [{ label: 'Champions', value: String(sl.championsOwned) }] : []),
              { label: 'Stock', value: isSold ? 'Sold out' : `${stock} left` },
              { label: 'Orders', value: String(orders) },
            ];

        return (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedListing(null)}>
            <div
              className="bg-gs-surface border border-gs-border sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Cover */}
              <div className="relative h-36 sm:h-40 shrink-0 bg-gs-surface-2">
                <ImageWithFallback src={sl.image || ''} alt={title || ''}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gs-surface via-gs-surface/20 to-transparent" />
                <button onClick={() => setSelectedListing(null)}
                  className="absolute top-3 right-3 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 p-1.5 rounded-lg transition-colors">
                  <X className="size-4" />
                </button>
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge>{isSkin ? 'Skin' : 'Account'}</Badge>
                  {isSkin && <Badge>Escrow</Badge>}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gs-text leading-snug pr-6">{title}</h2>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <SellerLine name={sl.seller} role={sl.seller_role} />
                    <span className="text-xs text-gs-faint">· {sl.game}</span>
                    {sl.created_at && (
                      <span className="text-xs text-gs-faint">
                        · {new Date(sl.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm border-y border-gs-border py-4">
                  {specs.map(row => (
                    <div key={row.label} className="flex justify-between gap-2 col-span-1">
                      <dt className="text-gs-faint shrink-0">{row.label}</dt>
                      <dd className={`font-medium text-right truncate ${row.highlight ? wearColor : 'text-gs-text'}`}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Seller notes */}
                <div>
                  <p className="text-xs font-semibold text-gs-muted mb-2">
                    {hasNotes ? 'From the seller' : 'About this listing'}
                  </p>
                  <p className="text-sm text-gs-muted leading-relaxed whitespace-pre-wrap">
                    {sellerNotes}
                  </p>
                </div>

                {isSkin && !isSold && (
                  <p className="text-[11px] text-gs-faint leading-relaxed">
                    Skin trades are handled through admin escrow — the seller uploads proof before delivery.
                  </p>
                )}

                <div className="flex items-center gap-2 text-[11px] text-gs-faint">
                  {(sl.views ?? 0) > 0 && (
                    <span className="flex items-center gap-1"><Eye className="size-3" />{sl.views} views</span>
                  )}
                  {orders > 0 && (
                    <span className="flex items-center gap-1"><TrendingUp className="size-3" />{orders} sold</span>
                  )}
                  {!isSold && stock <= 3 && stock > 0 && (
                    <span>{stock === 1 ? 'Last unit' : `${stock} units left`}</span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 py-4 border-t border-gs-border flex items-center gap-4">
                <div className="min-w-0">
                  <p className="text-xl font-bold text-gs-text">${sl.price.toLocaleString()}</p>
                  <p className="text-[11px] text-gs-faint truncate">
                    {isSold ? 'No longer available' : isSkin ? 'Trade via escrow' : 'Instant checkout'}
                  </p>
                </div>
                <button
                  onClick={e => handleAddToCart(e, sl)}
                  disabled={addingToCart[sl.id] || isSold}
                  className={`ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40 shrink-0 ${
                    isSold ? 'bg-gs-surface-2 text-gs-faint' : 'bg-gs-accent text-white hover:opacity-90'
                  }`}
                >
                  <ShoppingCart className="size-4" />
                  {isSold ? 'Sold out' : addingToCart[sl.id] ? 'Adding…' : isSkin ? 'Request trade' : 'Add to cart'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Game filter modal (when many categories) */}
      {showGameFilterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowGameFilterModal(false)}
        >
          <div
            className="bg-gs-surface border border-gs-border rounded-2xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gs-border">
              <h3 className="text-base font-bold text-gs-text">Filter by game</h3>
              <button
                onClick={() => setShowGameFilterModal(false)}
                className="text-gs-faint hover:text-gs-text p-1.5 rounded-lg hover:bg-gs-surface-2 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
              {availableGames.map(g => (
                <button
                  key={g}
                  onClick={() => { setGameFilter(g); setShowGameFilterModal(false); }}
                  className={filterBtnClass(gameFilter === g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildListingNotes(sl: StoreListingAPI): string {
  if (sl.type === 'skin') {
    const parts = [
      sl.wear,
      sl.float ? `float ${sl.float}` : null,
    ].filter(Boolean);
    return parts.length
      ? `${parts.join(', ')}.`
      : `${sl.game} skin — contact seller after purchase for delivery details.`;
  }
  const bits: string[] = [];
  if (sl.rank && sl.rank !== 'Unranked') bits.push(`${sl.rank} rank`);
  if (sl.hoursPlayed) bits.push(`${sl.hoursPlayed} hours played`);
  if (sl.skinsOwned) bits.push(`${sl.skinsOwned} skins on the account`);
  if (sl.championsOwned) bits.push(`${sl.championsOwned} champions unlocked`);
  if (sl.level) bits.push(`level ${sl.level}`);
  if (bits.length === 0) return `${sl.game} account ready to transfer after checkout.`;
  return bits.join(', ') + '.';
}

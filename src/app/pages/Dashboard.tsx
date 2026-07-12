import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowRight, Star, Tag,
  ChevronRight, Package, ShoppingCart, CheckCircle2, MonitorPlay
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { SteamCoverImage } from '../components/SteamCoverImage';
import { getUser, apiAddToCart } from '../lib/api';
import { IntroSplash } from '../components/IntroSplash';
import { HomeProductCarousel, CAROUSEL_ITEM_CLASS, CAROUSEL_SUB_ITEM_CLASS } from '../components/HomeProductCarousel';
import { getProductsByCatalog, ALL_PRODUCTS, type ProductItem } from '../lib/products';
import { applyLivePrices, useLiveCatalogPrices, LIVE_PRICE_CATALOGS } from '../lib/livePrices';
import { applySteamImages } from '../lib/steamImages';
import { HOME_CATALOG_SECTIONS, getCatalogById, type CatalogId } from '../lib/catalog';

const SPLASH_KEY = 'gg_intro_seen';

// ── Hero banners / featured games ─────────────────────────────────────────
const HERO_GAMES = [
  {
    title: 'GOTHIC 1 REMAKE',
    subtitle: 'Steam · Key · GLOBAL',
    badge: 'NEW',
    steamAppId: 1297900,
    price: 29.99,
  },
  {
    title: 'FORZA HORIZON 6',
    subtitle: 'Xbox Live · Key · GLOBAL',
    badge: 'NEW',
    steamAppId: 2483190,
    price: 49.99,
  },
  {
    title: 'LEGO BATMAN',
    subtitle: 'Steam · Key · GLOBAL',
    badge: 'NEW',
    steamAppId: 21000,
    price: 14.99,
  },
  {
    title: 'DESTINY 2',
    subtitle: 'Steam · Key · GLOBAL',
    badge: 'BEST SELLER',
    badgeColor: '#1a6fd4',
    steamAppId: 1085660,
    price: 0,
    free: true,
  },
];


// ── Quick-access links (logged in) ──────────────────────────────────────────

const QUICK_LINKS = [
  { to: '/store',          label: 'Player Store',     desc: 'Browse community listings',         icon: Tag },
  { to: '/community',      label: 'Community',         desc: 'Join the discussion',               icon: Star },
  { to: '/purchase-history', label: 'My Purchases',   desc: 'View your order history',           icon: Package },
];

function getCartType(item: ProductItem): string {
  if (item.type === 'random-key') return 'Random Key';
  if (item.catalog === 'software') return 'Software';
  if (item.catalog === 'subscriptions') return 'Subscription';
  if (item.catalog === 'gift-cards') return 'Gift Card';
  return 'Game Key';
}

function CatalogProductImage({
  item,
  className,
  variant = 'card',
}: {
  item: ProductItem;
  className?: string;
  variant?: 'hero' | 'card';
}) {
  if (item.steamAppId) {
    return <SteamCoverImage steamAppId={item.steamAppId} variant={variant} alt={item.title} className={className} />;
  }
  if (item.catalog === 'software') {
    return (
      <div
        className={`${className ?? ''} flex items-center justify-center`}
        style={{
          background: `linear-gradient(135deg, ${item.gameColor}24 0%, #ffffff 52%, ${item.gameColor}18 100%)`,
        }}
      >
        <ImageWithFallback
          src={item.image}
          alt={`${item.title} logo`}
          className="w-[42%] h-[58%] object-contain drop-shadow-md"
        />
      </div>
    );
  }
  if (item.catalog === 'gift-cards') {
    const needsWhiteLogo = item.image.includes('cdn.jsdelivr.net');
    return (
      <div
        className={`${className ?? ''} flex items-center justify-center`}
        style={{
          background: `radial-gradient(circle at 78% 20%, ${item.gameColor} 0%, transparent 34%), linear-gradient(135deg, ${item.gameColor} 0%, #090d18 72%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0 14px, rgba(255,255,255,.12) 14px 15px)' }} />
        <ImageWithFallback
          src={item.image}
          alt={`${item.title} logo`}
          className="relative z-10 w-[42%] h-[50%] object-contain drop-shadow-lg"
          style={{ filter: needsWhiteLogo ? 'brightness(0) invert(1)' : undefined }}
        />
      </div>
    );
  }
  return <ImageWithFallback src={item.image} alt={item.title} className={className} />;
}

interface ProductGridProps {
  items: ProductItem[];
  addingToCart: Record<string, boolean>;
  onAddToCart: (item: ProductItem) => void;
  idPrefix: string;
}

function ProductGrid({ items, addingToCart, onAddToCart, idPrefix }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item, i) => {
        const isAdding = addingToCart[item.id];
        const showDiscount = item.discount != null && item.origPrice != null;
        return (
          <div
            key={item.id}
            className="group gs-product-card relative rounded-xl overflow-hidden border hover:border-gs-accent/40 hover:shadow-lg flex flex-col"
            style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
          >
            <Link to={`/product/${item.id}`} className="block">
              <div className="relative h-32 overflow-hidden">
                <CatalogProductImage
                  item={item}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span
                  className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    background: showDiscount ? 'var(--gs-sale)' : (item.badgeColor || '#334155'),
                    color: '#fff',
                  }}
                >
                  {showDiscount ? `-${item.discount}%` : (item.badge.length > 12 ? item.badge.slice(0, 12) + '…' : item.badge)}
                </span>
              </div>
              <div className="px-2.5 pt-2.5 pb-1">
                <p className="text-xs font-semibold line-clamp-2 leading-tight mb-1" style={{ color: 'var(--gs-text)' }}>
                  {item.title}
                </p>
                <p className="text-[10px] mb-1" style={{ color: 'var(--gs-faint)' }}>{item.platform}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: 'var(--gs-accent)' }}>
                    {item.type === 'random-key' ? 'from ' : ''}${item.price.toFixed(2)}
                  </span>
                  {item.origPrice != null && (
                    <span className="text-[10px] line-through" style={{ color: 'var(--gs-faint)' }}>
                      ${item.origPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <div
              className={`absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-10 bg-gradient-to-t from-[var(--gs-surface)] via-[var(--gs-surface)]/95 to-transparent transition-all duration-200 ${
                isAdding
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
              }`}
            >
              <button
                id={`${idPrefix}-${i}`}
                onClick={() => onAddToCart(item)}
                disabled={isAdding}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shadow-md"
                style={{ background: 'var(--gs-accent)', color: '#fff', opacity: isAdding ? 0.7 : 1 }}
              >
                {isAdding
                  ? <><span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin inline-block" /> Adding…</>
                  : <><ShoppingCart className="size-3" /> Add to Cart</>
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCatalog = getCatalogById(searchParams.get('cat'));
  const [showSplash, setShowSplash] = useState(false);
  const [activeHero, setActiveHero] = useState(0);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  const [cartToast, setCartToast] = useState<string | null>(null);

  const steamAppIds = useMemo(
    () => ALL_PRODUCTS
      .filter(p => p.steamAppId && LIVE_PRICE_CATALOGS.includes(p.catalog))
      .map(p => p.steamAppId!),
    []
  );
  const { prices: livePrices, stats: liveStats, loading: livePricesLoading, fetchedAt: livePricesAt } = useLiveCatalogPrices(steamAppIds);

  const productsForSection = useCallback((sectionId: CatalogId) => {
    const base = getProductsByCatalog(sectionId);
    if (!LIVE_PRICE_CATALOGS.includes(sectionId)) return applySteamImages(base);
    return applyLivePrices(base, livePrices, liveStats);
  }, [livePrices, liveStats]);

  useEffect(() => {
    const seen = sessionStorage.getItem(SPLASH_KEY);
    if (!seen) setShowSplash(true);
  }, []);

  // Auto-rotate hero
  useEffect(() => {
    const t = setInterval(() => setActiveHero(h => (h + 1) % HERO_GAMES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSplashDone = () => {
    sessionStorage.setItem(SPLASH_KEY, '1');
    setShowSplash(false);
  };

  const handleAddToCart = async (item: ProductItem) => {
    if (!user) { navigate('/login'); return; }
    setAddingToCart(prev => ({ ...prev, [item.id]: true }));
    try {
      await apiAddToCart({
        item_id: item.id,
        name: item.title,
        game: item.game ?? 'Steam',
        game_color: item.gameColor ?? '#1b2838',
        type: getCartType(item),
        platform: item.platform,
        price: item.price,
        original_price: item.origPrice ?? null,
        image: item.image,
      });
      setCartToast(item.title);
      setTimeout(() => setCartToast(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToCart(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const visibleSections =
    activeCatalog === 'all'
      ? HOME_CATALOG_SECTIONS
      : activeCatalog === 'gaming'
        ? [{ id: 'gaming' as const, label: 'Gaming', subtitle: 'Popular titles and platform deals' }]
        : HOME_CATALOG_SECTIONS.filter(s => s.id === activeCatalog);

  return (
    <>
      {showSplash && <IntroSplash onEnter={handleSplashDone} />}

      {/* ── Cart added toast ───────────────────────────────────────────── */}
      {cartToast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl"
          style={{ background: 'var(--gs-surface)', borderColor: 'rgba(34,197,94,0.4)', boxShadow: '0 0 30px rgba(34,197,94,0.2)' }}
        >
          <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>Added to cart!</p>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{cartToast}</p>
          </div>
          <Link
            to="/cart"
            className="ml-2 text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--gs-accent)', color: '#fff' }}
          >
            View Cart
          </Link>
        </div>
      )}

      <div className="px-4 lg:px-6 py-6 space-y-10">

        {/* ══ HERO BANNER ═══════════════════════════════════════════════════ */}
        <section
          className="relative w-full overflow-hidden rounded-2xl border shadow-2xl"
          style={{ minHeight: 420, background: '#0e0b16', borderColor: 'var(--gs-border)' }}
        >
          {HERO_GAMES.map((g, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === activeHero ? 1 : 0, pointerEvents: i === activeHero ? 'auto' : 'none' }}
            >
              <SteamCoverImage
                steamAppId={g.steamAppId}
                variant="hero"
                alt={g.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Content */}
          <div className="relative z-10 w-full h-full p-8 lg:p-10 flex flex-col justify-center max-w-2xl">
            {(() => {
              const game = HERO_GAMES[activeHero];
              return (
                <div key={activeHero} className="space-y-4 animate-in fade-in duration-500">
                  <span
                    className="inline-block text-[10px] font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider"
                    style={{ background: game.badgeColor || 'var(--gs-accent)' }}
                  >
                    {game.badge}
                  </span>
                  <h2 className="text-white font-black text-4xl lg:text-5xl leading-tight tracking-tight drop-shadow-md">
                    {game.title}
                  </h2>
                  <p className="text-white/70 text-sm font-medium">
                    {game.subtitle}
                  </p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-white font-black text-2xl lg:text-3xl drop-shadow-md">
                      {game.free ? 'FREE' : `$${game.price.toFixed(2)}`}
                    </span>
                    <Link
                      to="/store"
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 shadow-lg"
                      style={{ background: 'var(--gs-accent)', color: '#fff' }}
                    >
                      Play Now <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })()}

            {/* Thumbnails */}
            <div className="flex gap-2 pt-6 relative z-10">
              {HERO_GAMES.map((g, i) => (
                <button key={i} onClick={() => setActiveHero(i)} className={`w-14 h-9 rounded-lg overflow-hidden border-2 transition-all ${i===activeHero ? 'border-[var(--gs-accent)] opacity-100' : 'border-white/20 opacity-50 hover:opacity-100'}`}>
                  <SteamCoverImage steamAppId={g.steamAppId} variant="hero" className="w-full h-full object-cover" alt={g.title} />
                </button>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="absolute bottom-6 right-8 flex gap-2 z-10">
            {HERO_GAMES.map((_, i) => (
              <button key={i} onClick={() => setActiveHero(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i===activeHero ? 'bg-white' : 'bg-white/40'}`} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </section>

        {/* ══ CATALOG SECTIONS ═════════════════════════════════════════ */}
        <div className="space-y-12">
          {visibleSections.map(section => {
            const products = productsForSection(section.id);
            if (products.length === 0) return null;

            const showLiveBadge = LIVE_PRICE_CATALOGS.includes(section.id) && livePricesAt;

            if (section.id === 'subscriptions') {
              return (
                <section key={section.id}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--gs-text)' }}>{section.label}</h2>
                        {showLiveBadge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: 'var(--gs-accent)', borderColor: 'var(--gs-accent)', opacity: livePricesLoading ? 0.6 : 1 }}>
                            {livePricesLoading ? 'Updating prices…' : 'Live prices'}
                          </span>
                        )}
                      </div>
                      {section.subtitle && (
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--gs-faint)' }}>{section.subtitle}</p>
                      )}
                    </div>
                    <Link
                      to={`/store?cat=${section.id}`}
                      className="flex items-center gap-1 text-xs font-bold transition-all hover:text-white"
                      style={{ color: 'var(--gs-muted)' }}
                    >
                      View all <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                  
                  <HomeProductCarousel>
                    {products.map((item, i) => {
                      const showDiscount = item.discount != null && item.origPrice != null;
                      const isAdding = addingToCart[item.id];
                      return (
                        <div key={item.id} className={CAROUSEL_SUB_ITEM_CLASS}>
                        <div className="relative rounded-2xl overflow-hidden border border-gs-border h-48 group shadow-sm transition-all hover:border-gs-accent/40">
                          <CatalogProductImage item={item} variant="hero" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                          <div className="absolute inset-0 p-5 flex flex-col justify-between">
                            <span className="self-start text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-white" style={{ background: showDiscount ? 'var(--gs-sale)' : (item.badgeColor || '#334155') }}>
                              {showDiscount ? `-${item.discount}%` : item.badge}
                            </span>
                            <div>
                              <h3 className="font-bold text-lg leading-tight text-white mb-0.5">{item.title}</h3>
                              <p className="text-xs font-semibold text-gs-faint mb-3">{item.platform}</p>
                              <div className="flex items-end gap-2">
                                <span className="text-xl font-black text-white">${item.price.toFixed(2)}</span>
                                {item.origPrice != null && <span className="text-sm font-bold text-gs-faint line-through mb-0.5">${item.origPrice.toFixed(2)}</span>}
                              </div>
                            </div>
                            <button
                              id={`add-cart-${section.id}-${i}`}
                              onClick={(e) => { e.preventDefault(); handleAddToCart(item); }}
                              disabled={isAdding}
                              className={`absolute bottom-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isAdding ? 'opacity-70 bg-gs-surface' : 'bg-gs-accent hover:scale-105'} text-white shadow-lg`}
                            >
                              {isAdding ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> : <ShoppingCart className="size-4" />}
                            </button>
                          </div>
                        </div>
                        </div>
                      );
                    })}
                  </HomeProductCarousel>
                </section>
              );
            }

            // Normal product grid for other sections
            return (
              <section key={section.id}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--gs-text)' }}>{section.label}</h2>
                      {showLiveBadge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: 'var(--gs-accent)', borderColor: 'var(--gs-accent)', opacity: livePricesLoading ? 0.6 : 1 }}>
                          {livePricesLoading ? 'Updating prices…' : 'Live prices'}
                        </span>
                      )}
                    </div>
                    {section.subtitle && (
                      <p className="text-sm font-medium mt-1" style={{ color: 'var(--gs-faint)' }}>{section.subtitle}</p>
                    )}
                  </div>
                  <Link
                    to={`/store${section.id !== 'gaming' ? `?cat=${section.id}` : ''}`}
                    className="flex items-center gap-1 text-xs font-bold transition-all hover:text-white"
                    style={{ color: 'var(--gs-muted)' }}
                  >
                    View all <ChevronRight className="size-3.5" />
                  </Link>
                </div>
                
                <HomeProductCarousel>
                  {products.map((item, i) => {
                    const isAdding = addingToCart[item.id];
                    const showDiscount = item.discount != null && item.origPrice != null;
                    return (
                      <div key={item.id} className={CAROUSEL_ITEM_CLASS}>
                      <div className="group gs-product-card relative rounded-2xl overflow-hidden border hover:border-[var(--gs-accent)]/40 hover:shadow-lg flex flex-col h-full"
                        style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
                        <Link to={`/product/${item.id}`} className="block flex-1 flex flex-col">
                          <div className="relative h-44 overflow-hidden">
                            <CatalogProductImage item={item} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <span className="absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest text-white" style={{ background: showDiscount ? 'var(--gs-sale)' : (item.badgeColor || '#334155') }}>
                              {showDiscount ? `-${item.discount}%` : item.badge}
                            </span>
                          </div>
                          <div className="p-3.5 flex-1 flex flex-col">
                            <h3 className="font-bold text-sm leading-tight mb-1 line-clamp-2" style={{ color: 'var(--gs-text)' }}>{item.title}</h3>
                            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                              <span className="text-base font-black" style={{ color: 'var(--gs-accent)' }}>${item.price.toFixed(2)}</span>
                              {item.origPrice != null && <span className="text-[10px] font-bold text-gs-faint line-through">${item.origPrice.toFixed(2)}</span>}
                              <MonitorPlay className="size-3.5 ml-auto shrink-0" style={{ color: 'var(--gs-faint)' }} />
                            </div>
                          </div>
                        </Link>
                        <div
                          className={`absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-10 bg-gradient-to-t from-[var(--gs-surface)] via-[var(--gs-surface)]/95 to-transparent transition-all duration-200 ${
                            isAdding
                              ? 'opacity-100 translate-y-0 pointer-events-auto'
                              : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
                          }`}
                        >
                          <button
                            id={`add-cart-${section.id}-${i}`}
                            onClick={(e) => { e.preventDefault(); handleAddToCart(item); }}
                            disabled={isAdding}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shadow-md"
                            style={{ background: 'var(--gs-accent)', color: '#fff', opacity: isAdding ? 0.7 : 1 }}
                          >
                            {isAdding
                              ? <><span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin inline-block" /> Adding…</>
                              : <><ShoppingCart className="size-3" /> Add to Cart</>
                            }
                          </button>
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </HomeProductCarousel>
              </section>
            );
          })}

          {visibleSections.every(s => productsForSection(s.id).length === 0) && (
            <section className="rounded-xl border px-6 py-10 text-center" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--gs-muted)' }}>No products found in this category yet.</p>
              <button
                onClick={() => setCatalogFilter('all')}
                className="mt-3 text-sm font-semibold"
                style={{ color: 'var(--gs-accent)' }}
              >
                Browse all categories
              </button>
            </section>
          )}

          {/* ══ AI FEATURES STRIP (for logged-in) or CTA (for guests) ══════ */}
          {user ? (
            <section className="gg-welcome-panel relative rounded-3xl overflow-hidden border border-gs-border min-h-[170px] flex items-center shadow-sm">
              <div className="absolute inset-0">
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80" 
                  alt="bg" 
                  className="w-full h-full object-cover opacity-[0.08]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--gs-surface)] via-[var(--gs-surface)]/95 to-[var(--gs-surface)]/65" />
                <div className="gg-welcome-orb absolute -right-20 -top-32 size-80 rounded-full" />
              </div>
              <div className="relative z-10 px-7 lg:px-9 py-7 w-full flex flex-col md:flex-row items-center justify-between gap-7">
                <div className="flex items-center gap-4">
                  <div className="gg-avatar-ring w-16 h-16 rounded-2xl border border-gs-border p-1.5 flex items-center justify-center bg-gs-bg shrink-0 shadow-sm">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4`} 
                      alt="avatar" 
                      className="w-full h-full rounded-full" 
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-1" style={{ color: 'var(--gs-accent)' }}>Player dashboard</p>
                    <h2 className="font-black text-2xl lg:text-3xl tracking-tight text-gs-text">
                      Welcome back, {user.username}!
                    </h2>
                    <p className="text-sm font-medium text-gs-faint mt-0.5">Your AI-powered gaming hub</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
                  {QUICK_LINKS.map((l, i) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="gg-quick-link group flex justify-between items-center gap-3 min-w-[145px] px-4 py-3 rounded-2xl border border-gs-border bg-gs-bg/75 backdrop-blur-md text-sm font-bold shadow-sm"
                      style={{ animationDelay: `${i * 90 + 120}ms` }}
                    >
                      <span className="flex items-center gap-2"><l.icon className="size-4" />{l.label}</span>
                      <ArrowRight className="size-3.5 opacity-40 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            /* CTA Banner for guests */
            <section
              className="rounded-2xl overflow-hidden relative flex items-center min-h-[160px]"
              style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0a0a1a 50%, #1a1000 100%)' }}
            >
              <div className="absolute inset-0 opacity-30">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80"
                  alt="Gaming background"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.4) 0%, transparent 70%)' }} />
              <div className="relative z-10 px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-2">GameGuide AI Assistant</p>
                  <h1 className="text-white font-black text-2xl md:text-3xl leading-tight">
                    Your gaming hub.<br />
                    <span style={{ color: 'var(--gs-accent)' }}>AI-powered</span>, community-driven.
                  </h1>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to="/register"
                    id="hero-register-cta"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: 'var(--gs-accent)', color: '#fff' }}
                  >
                    Get Started <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/login"
                    id="hero-login-cta"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-white/30 text-white hover:bg-white/10 transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ══ AI FEATURES CARDS ══════════════════════════════════════════ */}
          <section>
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-1" style={{ color: 'var(--gs-accent)' }}>Built for players</p>
                <h3 className="font-black text-2xl tracking-tight text-gs-text">Experience GameGuide</h3>
              </div>
              <span className="hidden sm:block text-xs font-medium text-gs-faint">Everything you need, in one hub</span>
            </div>
            <div className="grid md:grid-cols-12 gap-4">
              {[
                {
                  img: 'https://images.unsplash.com/photo-1775410631936-7de96322df0b?auto=format&fit=crop&w=1400&q=85',
                  title: 'AI Game Guides',
                  desc: 'Personalised strategy tips powered by advanced AI for top competitive games.',
                  link: '/store',
                },
                {
                  img: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80',
                  title: 'In-Game Marketplace',
                  desc: 'Buy & sell skins, accounts, and items from real players securely.',
                  link: '/store',
                },
                {
                  img: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&q=80',
                  title: 'Community Forum',
                  desc: 'Join discussions on loadouts, tier lists, and meta strategies.',
                  link: '/community',
                },
              ].map((f, i) => (
                <Link
                  key={i}
                  to={f.link}
                  className={`gg-feature-card group relative overflow-hidden border border-gs-border block shadow-sm ${
                    i === 0 ? 'md:col-span-6 h-64' : 'md:col-span-3 h-64'
                  }`}
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <ImageWithFallback 
                    src={f.img} 
                    alt={f.title} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/5" />
                  <div className="absolute top-4 left-4 size-8 rounded-full border border-white/20 bg-black/25 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white/80">
                    0{i + 1}
                  </div>
                  <div className="absolute inset-0 p-5 lg:p-6 flex flex-col justify-end">
                    <h4 className={`${i === 0 ? 'text-2xl' : 'text-lg'} text-white font-black mb-1.5 tracking-tight`}>{f.title}</h4>
                    <p className="text-white/70 text-xs leading-relaxed font-medium max-w-md">{f.desc}</p>
                    <div className="gg-feature-cta mt-4 flex items-center gap-1.5 text-xs font-bold text-white">
                      Explore now <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowRight, CheckCircle2, ChevronRight, Package,
  ShieldCheck, ShoppingCart, Sparkles, Star, Trophy, Users,
  Zap,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { SteamCoverImage } from '../components/SteamCoverImage';
import { IntroSplash } from '../components/IntroSplash';
import { HomeProductCarousel, CAROUSEL_ITEM_CLASS, CAROUSEL_SUB_ITEM_CLASS } from '../components/HomeProductCarousel';
import { getUser, apiAddToCart } from '../lib/api';
import { ALL_PRODUCTS, getProductsByCatalog, type ProductItem } from '../lib/products';
import { HOME_CATALOG_SECTIONS, getCatalogById, type CatalogId } from '../lib/catalog';
import { applyLivePrices, useLiveCatalogPrices, LIVE_PRICE_CATALOGS } from '../lib/livePrices';
import { applySteamImages } from '../lib/steamImages';
import { useSteamTopGames } from '../lib/useSteamTopGames';

const SPLASH_KEY = 'gg_intro_seen';

const HERO_GAMES = [
  { title: 'GOTHIC 1 REMAKE', subtitle: 'Steam key, global activation', badge: 'Featured drop', steamAppId: 1297900, price: 29.99 },
  { title: 'FORZA HORIZON 6', subtitle: 'Xbox key, global activation', badge: 'Racing watchlist', steamAppId: 2483190, price: 49.99 },
  { title: 'DESTINY 2', subtitle: 'Online service, instant library add', badge: 'Player favorite', steamAppId: 1085660, price: 0, free: true },
];

const COMMAND_LINKS = [
  { to: '/store',     label: 'Trade Vault',  desc: 'Community skins and accounts'   },
  { to: '/vision',    label: 'AI Scanner',   desc: 'Read screenshots and item data'  },
  { to: '/community', label: 'Forum',        desc: 'Tactics, clips, and guides'      },
  { to: '/top-up',    label: 'Wallet',       desc: 'Top up before checkout'          },
];

const FEATURE_CARDS = [
  {
    title: 'AI game guidance',
    body: 'Upload screenshots, identify items, and ask for game-specific advice without leaving the marketplace.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80',
    icon: Sparkles,
    to: '/vision',
  },
  {
    title: 'Protected trades',
    body: 'Skin requests use proof upload and admin review, so buyers can avoid risky off-platform trades.',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=900&q=80',
    icon: ShieldCheck,
    to: '/store',
  },
  {
    title: 'Player community',
    body: 'Discuss loadouts, prices, ranks, clips, and meta shifts with the people buying and selling here.',
    image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=900&q=80',
    icon: Users,
    to: '/community',
  },
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
      <div className={`${className ?? ''} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${item.gameColor}24 0%, #10151d 54%, ${item.gameColor}18 100%)` }}>
        <ImageWithFallback src={item.image} alt={`${item.title} logo`} className="w-[42%] h-[58%] object-contain drop-shadow-md" />
      </div>
    );
  }
  if (item.catalog === 'gift-cards') {
    const needsWhiteLogo = item.image.includes('cdn.jsdelivr.net');
    return (
      <div className={`${className ?? ''} flex items-center justify-center`} style={{ background: `radial-gradient(circle at 78% 20%, ${item.gameColor} 0%, transparent 34%), linear-gradient(135deg, ${item.gameColor} 0%, #090d18 72%)` }}>
        <ImageWithFallback src={item.image} alt={`${item.title} logo`} className="relative z-10 w-[42%] h-[50%] object-contain drop-shadow-lg" style={{ filter: needsWhiteLogo ? 'brightness(0) invert(1)' : undefined }} />
      </div>
    );
  }
  return <ImageWithFallback src={item.image} alt={item.title} className={className} />;
}

function ProductTile({
  item,
  adding,
  onAddToCart,
  id,
  wide = false,
}: {
  item: ProductItem;
  adding: boolean;
  onAddToCart: (item: ProductItem) => void;
  id: string;
  wide?: boolean;
}) {
  const showDiscount = item.discount != null && item.origPrice != null;
  return (
    <article className={`gg-game-tile group relative overflow-hidden border transition-all duration-200 ${wide ? 'h-56' : 'h-full min-h-72'}`}>
      <Link to={`/product/${item.id}`} className="block h-full">
        <div className={`${wide ? 'absolute inset-0' : 'relative h-44'} overflow-hidden`}>
          <CatalogProductImage item={item} variant={wide ? 'hero' : 'card'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
        </div>
        <div className={`${wide ? 'absolute inset-0 p-5 flex flex-col justify-end' : 'p-4'} relative z-10`}>
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className={wide ? "rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/80" : "rounded-full border border-gs-border bg-gs-surface-2 px-2.5 py-1 text-[10px] font-bold text-gs-muted"}>
              {showDiscount ? `${item.discount}% off` : item.badge}
            </span>
            <span className={wide ? "text-[10px] font-semibold text-white/45" : "text-[10px] font-semibold text-gs-faint"}>{item.platform}</span>
          </div>
          <h3 className={`${wide ? 'text-xl text-white' : 'text-sm text-gs-text'} font-black leading-tight line-clamp-2`}>{item.title}</h3>
          <div className="mt-3 pr-10">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-black text-[var(--gs-accent2)]">{item.type === 'random-key' ? 'from ' : ''}${item.price.toFixed(2)}</span>
              {item.origPrice != null && <span className={wide ? "text-xs font-semibold text-white/35 line-through" : "text-xs font-semibold text-gs-faint line-through"}>${item.origPrice.toFixed(2)}</span>}
            </div>
          </div>
        </div>
      </Link>
      <button
        id={id}
        onClick={(e) => { e.preventDefault(); onAddToCart(item); }}
        disabled={adding}
        title={adding ? 'Adding…' : 'Add to Cart'}
        className="absolute bottom-3 right-3 z-20 flex size-8 items-center justify-center rounded-full transition-all disabled:opacity-60 hover:scale-110 gg-action-primary"
      >
        {adding
          ? <span className="size-3 rounded-full border border-black/30 border-t-black animate-spin" />
          : <ShoppingCart className="size-3.5" />
        }
      </button>
    </article>
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

  const steamIds = useMemo(
    () => ALL_PRODUCTS.filter(p => p.steamAppId && LIVE_PRICE_CATALOGS.includes(p.catalog)).map(p => p.steamAppId!),
    []
  );
  const { prices: livePrices, stats: liveStats, loading: livePricesLoading, fetchedAt: livePricesAt } = useLiveCatalogPrices(steamIds);
  const { games: steamTopGames, loading: steamTopLoading } = useSteamTopGames(40);

  const productsForSection = useCallback((sectionId: CatalogId) => {
    const base = getProductsByCatalog(sectionId);
    if (!LIVE_PRICE_CATALOGS.includes(sectionId)) return applySteamImages(base);
    return applyLivePrices(base, livePrices, liveStats);
  }, [livePrices, liveStats]);

  useEffect(() => {
    const seen = sessionStorage.getItem(SPLASH_KEY);
    if (!seen) setShowSplash(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setActiveHero(h => (h + 1) % HERO_GAMES.length), 4800);
    return () => clearInterval(timer);
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

  const visibleSections = activeCatalog === 'all'
    ? HOME_CATALOG_SECTIONS
    : activeCatalog === 'gaming'
      ? [{ id: 'gaming' as const, label: 'Gaming', subtitle: 'Popular titles and platform deals' }]
      : HOME_CATALOG_SECTIONS.filter(s => s.id === activeCatalog);

  const hero = HERO_GAMES[activeHero];
  const spotlightProducts = applySteamImages(ALL_PRODUCTS.slice(0, 6));

  return (
    <>
      {showSplash && <IntroSplash onEnter={handleSplashDone} />}

      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-gs-border bg-gs-surface px-4 py-3 shadow-2xl">
          <CheckCircle2 className="size-5 shrink-0 text-[var(--gs-accent2)]" />
          <div>
            <p className="text-sm font-bold text-gs-text">Added to cart</p>
            <p className="text-xs text-gs-faint">{cartToast}</p>
          </div>
          <Link to="/cart" className="ml-2 rounded-full px-3 py-1.5 text-xs font-black gg-action-primary">View Cart</Link>
        </div>
      )}

      <div className="gg-page-shell space-y-8">
        <section className="grid min-h-[520px] gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
          <div className="gg-panel relative overflow-hidden p-5 lg:p-8">
            <SteamCoverImage steamAppId={hero.steamAppId} variant="hero" alt={hero.title} className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080a0f] via-[#080a0f]/78 to-[#080a0f]/24" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080a0f] to-transparent" />
            <div className="relative z-10 flex min-h-[480px] max-w-3xl flex-col justify-end">
              <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-white/70">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{hero.badge}</span>
                <span>{hero.subtitle}</span>
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[.92] text-white sm:text-6xl lg:text-7xl">
                Play smarter. Trade sharper.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/68">
                GameGuide combines instant keys, protected player trades, wallet checkout, and AI screenshot analysis in one gaming command center.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/store" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black gg-action-primary">
                  Enter Trade Vault <ArrowRight className="size-4" />
                </Link>
                <Link to="/vision" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold gg-action-secondary">
                  Scan Screenshot <Sparkles className="size-4" />
                </Link>
              </div>
            </div>
            <div className="absolute right-5 top-5 z-10 flex gap-2">
              {HERO_GAMES.map((g, i) => (
                <button
                  key={g.title}
                  onClick={() => setActiveHero(i)}
                  className={`h-2.5 rounded-full transition-all ${i === activeHero ? 'w-10 bg-[var(--gs-accent)]' : 'w-2.5 bg-white/35'}`}
                  aria-label={`Show ${g.title}`}
                />
              ))}
            </div>
          </div>

          <aside className="grid gap-5">
            <div className="gg-panel p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gs-muted">Today spotlight</p>
                  <h2 className="mt-1 text-2xl font-black leading-none text-gs-text">{hero.title}</h2>
                </div>
                <div className="rounded-2xl border border-gs-border bg-gs-surface-2 px-4 py-3 text-right">
                  <p className="text-[10px] font-bold text-gs-faint">STARTS AT</p>
                  <p className="text-xl font-black text-[var(--gs-accent2)]">{hero.free ? 'FREE' : `$${hero.price.toFixed(2)}`}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {spotlightProducts.slice(0, 3).map(product => (
                  <Link key={product.id} to={`/product/${product.id}`} className="group overflow-hidden rounded-2xl border border-gs-border bg-gs-surface-2">
                    <CatalogProductImage item={product} className="h-24 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="gg-panel p-5">
              <h2 className="text-lg font-black text-gs-text">Player command</h2>
              <div className="mt-4 grid gap-2">
                {COMMAND_LINKS.map(item => (
                  <Link key={item.to} to={item.to} className="group flex items-center gap-3 rounded-2xl border border-gs-border bg-gs-surface-2 p-3 transition-all hover:border-[var(--gs-accent)]/45">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-gs-text">{item.label}</span>
                      <span className="block truncate text-xs text-gs-faint">{item.desc}</span>
                    </span>
                    <ChevronRight className="size-4 text-gs-faint transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Catalog items', value: ALL_PRODUCTS.length, icon: Package },
            { label: 'Protected routes', value: 8, icon: ShieldCheck },
            { label: 'Price feeds', value: livePricesAt ? 'On' : livePricesLoading ? 'Sync' : 'Ready', icon: Zap },
            { label: 'Community layer', value: 'Forum', icon: Trophy },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="gg-panel p-5" style={{ animationDelay: `${i * 70}ms` }}>
                <Icon className="size-5 text-[var(--gs-accent)]" />
                <p className="mt-5 text-3xl font-black text-gs-text">{stat.value}</p>
                <p className="mt-1 text-xs font-bold text-gs-faint">{stat.label}</p>
              </div>
            );
          })}
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="gg-section-title">Featured drops</h2>
              <p className="mt-2 max-w-xl text-sm text-gs-faint">Fast moving keys, subscriptions, and gift products from the GameGuide catalog.</p>
            </div>
            <Link to="/store" className="hidden items-center gap-1 text-sm font-bold text-[var(--gs-accent)] sm:flex">View market <ChevronRight className="size-4" /></Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            {spotlightProducts[0] && (
              <ProductTile item={spotlightProducts[0]} adding={!!addingToCart[spotlightProducts[0].id]} onAddToCart={handleAddToCart} id="spotlight-main-add" wide />
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {spotlightProducts.slice(1, 3).map((item, i) => (
                <ProductTile key={item.id} item={item} adding={!!addingToCart[item.id]} onAddToCart={handleAddToCart} id={`spotlight-side-${i}`} wide />
              ))}
            </div>
          </div>
        </section>

        {/* ── Live Steam Top Games (from Steam API) ───────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="gg-section-title">Steam game keys</h2>
                {!steamTopLoading && steamTopGames.length > 0 && (
                  <span className="text-[10px] font-bold text-gs-faint">Live · {steamTopGames.length} titles</span>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-sm text-gs-faint">Instant Steam activations — top titles, clearance picks, and the best prices</p>
            </div>
            <Link to="/store?cat=steam-game-keys" className="hidden items-center gap-1 text-sm font-bold text-gs-muted hover:text-gs-text sm:flex">
              View all <ChevronRight className="size-4" />
            </Link>
          </div>
          <HomeProductCarousel>
            {steamTopLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`${CAROUSEL_ITEM_CLASS} h-72 rounded-2xl bg-gs-surface-2 border border-gs-border`} />
                ))
              : steamTopGames.map((g, i) => {
                  const id = `steam-top-${g.appid}`;
                  const item: import('../lib/products').ProductItem = {
                    id,
                    title: g.name,
                    platform: 'Steam · PC',
                    price: g.price ?? 0,
                    origPrice: g.origPrice ?? undefined,
                    discount: g.discount > 0 ? g.discount : undefined,
                    image: g.headerImage,
                    badge: g.discount > 0 ? `${g.discount}% off` : 'Steam Key',
                    catalog: 'steam-game-keys',
                    type: 'catalog',
                    steamAppId: g.appid,
                    game: g.name,
                    gameColor: '#1b2838',
                  };
                  return (
                    <div key={id} className={CAROUSEL_ITEM_CLASS}>
                      <ProductTile item={item} adding={!!addingToCart[id]} onAddToCart={handleAddToCart} id={`add-steam-top-${i}`} />
                    </div>
                  );
                })
            }
          </HomeProductCarousel>
        </section>

        {/* ── Other catalog sections (Software, Subscriptions, etc.) ─────── */}
        <div className="space-y-10">
          {visibleSections.filter(s => s.id !== 'steam-game-keys').map(section => {
            const products = productsForSection(section.id);
            if (products.length === 0) return null;
            const isSubscriptions = section.id === 'subscriptions';
            return (
              <section key={section.id} className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="gg-section-title">{section.label}</h2>
                    {section.subtitle && <p className="mt-2 max-w-2xl text-sm text-gs-faint">{section.subtitle}</p>}
                  </div>
                  <Link to={`/store${section.id !== 'gaming' ? `?cat=${section.id}` : ''}`} className="hidden items-center gap-1 text-sm font-bold text-gs-muted hover:text-gs-text sm:flex">
                    View all <ChevronRight className="size-4" />
                  </Link>
                </div>
                <HomeProductCarousel>
                  {products.map((item, i) => (
                    <div key={item.id} className={isSubscriptions ? CAROUSEL_SUB_ITEM_CLASS : CAROUSEL_ITEM_CLASS}>
                      <ProductTile item={item} adding={!!addingToCart[item.id]} onAddToCart={handleAddToCart} id={`add-cart-${section.id}-${i}`} wide={isSubscriptions} />
                    </div>
                  ))}
                </HomeProductCarousel>
              </section>
            );
          })}
        </div>

        <section className="grid gap-4 md:grid-cols-12">
          {FEATURE_CARDS.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.title} to={feature.to} className={`gg-panel group relative min-h-72 overflow-hidden p-6 ${index === 0 ? 'md:col-span-6' : 'md:col-span-3'}`}>
                <ImageWithFallback src={feature.image} alt={feature.title} className="absolute inset-0 h-full w-full object-cover opacity-42 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/72 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-black/30 text-[var(--gs-accent2)] backdrop-blur-md"><Icon className="size-5" /></span>
                  <div>
                    <h3 className="text-xl font-black text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{feature.body}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--gs-accent2)]">Open <ArrowRight className="size-4" /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}

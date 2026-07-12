import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Star, ShoppingCart, Heart, ChevronRight, Shield,
  Globe, Key, Monitor, CheckCircle2, Zap, Gift,
  Copy, AlertTriangle, Users, ChevronDown,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { SteamCoverImage } from '../components/SteamCoverImage';
import { getUser, apiAddToCart } from '../lib/api';
import { getProductById, ALL_PRODUCTS, type ProductItem } from '../lib/products';
import { applyLivePrices, useLiveCatalogPrices, formatPlayerCount } from '../lib/livePrices';
import { getProductScreenshots } from '../lib/steamImages';

// ── Star rating renderer ─────────────────────────────────────────────────────
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          style={{
            width: size,
            height: size,
            fill: n <= Math.round(rating) ? '#f59e0b' : 'transparent',
            stroke: '#f59e0b',
            strokeWidth: 1.5,
          }}
        />
      ))}
    </div>
  );
}

// ── Toast helper ─────────────────────────────────────────────────────────────
function Toast({ message, sub, onCart }: { message: string; sub: string; onCart: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-slide-up"
      style={{
        background: 'var(--gs-surface)',
        borderColor: 'rgba(34,197,94,0.4)',
        boxShadow: '0 0 30px rgba(34,197,94,0.2)',
      }}
    >
      <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>{message}</p>
        <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{sub}</p>
      </div>
      <button
        onClick={onCart}
        className="ml-2 text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--gs-accent)', color: '#fff' }}
      >
        View Cart
      </button>
    </div>
  );
}

// ── Main product detail page ─────────────────────────────────────────────────
export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getUser();

  const rawProduct = getProductById(id ?? '');
  const steamIds = useMemo(
    () => (rawProduct?.steamAppId ? [rawProduct.steamAppId] : []),
    [rawProduct?.steamAppId, id]
  );
  const { prices: livePrices, stats: liveStats, loading: liveLoading, fetchedAt: livePricesAt } = useLiveCatalogPrices(steamIds);
  const product = useMemo(() => {
    if (!rawProduct) return undefined;
    return applyLivePrices([rawProduct], livePrices, liveStats)[0];
  }, [rawProduct, livePrices, liveStats]);

  const relatedProducts = useMemo(() => {
    if (!rawProduct) return [];
    const sameCatalog = ALL_PRODUCTS.filter(
      p => p.id !== rawProduct.id && p.catalog === rawProduct.catalog
    );
    const fallback = ALL_PRODUCTS.filter(p => p.id !== rawProduct.id);
    const pool = sameCatalog.length >= 3 ? sameCatalog : fallback;
    return applyLivePrices(pool.slice(0, 4), livePrices, liveStats);
  }, [rawProduct, livePrices, liveStats]);

  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Product not found
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <AlertTriangle className="size-12 mx-auto" style={{ color: 'var(--gs-faint)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--gs-text)' }}>Product not found</h1>
        <p style={{ color: 'var(--gs-faint)' }}>This product doesn't exist or has been removed.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--gs-accent)', color: '#fff' }}
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const images = getProductScreenshots(product);
  const heroImage = images[0];

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAdding(true);
    try {
      await apiAddToCart({
        item_id: product.id,
        name: product.title,
        game: product.game ?? 'Steam',
        game_color: product.gameColor ?? '#1b2838',
        type: product.type === 'random-key' ? 'Random Key' : 'Game Key',
        platform: product.platform,
        price: product.price,
        original_price: product.origPrice ?? null,
        image: product.image,
      });
      setToast(true);
      setTimeout(() => setToast(false), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const displayTitle = product.title.split(':')[0].split(' - ')[0].toUpperCase();

  return (
    <div style={{ background: 'var(--gs-bg)' }}>

      {/* ══ HERO — game launcher style ═══════════════════════════════════════ */}
      <section
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100svh - var(--gs-topbar-height) - var(--gs-footer-height))' }}
      >
        <div className="absolute inset-0">
          {product.steamAppId ? (
            <SteamCoverImage
              steamAppId={product.steamAppId}
              variant="hero"
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <ImageWithFallback
              src={heroImage}
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a14]/95 via-[#0c0a14]/70 to-[#0c0a14]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a14] via-transparent to-[#0c0a14]/40" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-6 p-5 lg:p-8">
          {/* Main hero content */}
          <div className="relative flex-1 flex flex-col justify-end pb-4 lg:pb-8 min-h-[420px] lg:min-h-0">
            <Link
              to="/"
              className="absolute top-0 left-0 flex items-center gap-1 text-xs font-medium text-white/50 hover:text-white transition-colors"
            >
              <ChevronRight className="size-3 rotate-180" /> Back to store
            </Link>

            {product.discount != null && product.discount > 0 && (
              <span
                className="self-start mb-3 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest"
                style={{ background: 'var(--gs-sale)', color: '#fff' }}
              >
                -{product.discount}% off
              </span>
            )}

            <h1 className="text-5xl lg:text-7xl font-black text-white leading-none tracking-tight mb-4 drop-shadow-lg">
              {displayTitle}
            </h1>

            <p className="text-sm lg:text-base text-white/70 leading-relaxed max-w-xl mb-6">
              {product.description ?? `${product.title} — ${product.platform}. Instant digital delivery, activate on ${product.game ?? 'Steam'}.`}
            </p>

            {/* Rating + live stats row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <StarRating rating={product.rating ?? 4.5} />
                <span className="font-bold text-amber-400">{product.rating?.toFixed(1)}</span>
                <span className="text-white/40">({product.reviews?.toLocaleString()} reviews)</span>
              </div>
              {product.currentPlayers != null && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <Users className="size-3.5" />
                  {formatPlayerCount(product.currentPlayers)} playing now
                </span>
              )}
              <span className="text-white/50 text-xs">{product.platform}</span>
            </div>

            {/* Price + actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-2">
                <p className="text-3xl font-black text-white">
                  ${product.price.toFixed(2)}
                  {product.origPrice != null && (
                    <span className="text-lg font-bold text-white/40 line-through ml-2">
                      ${product.origPrice.toFixed(2)}
                    </span>
                  )}
                </p>
                {product.livePrice && (
                  <p className="text-[10px] text-violet-300 font-semibold mt-0.5">
                    {liveLoading ? 'Updating live price…' : 'Live market price'}
                  </p>
                )}
              </div>

              <button
                id="product-add-cart-btn"
                onClick={handleAddToCart}
                disabled={adding}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 shadow-lg"
                style={{ background: 'var(--gs-accent)', color: '#fff', opacity: adding ? 0.7 : 1 }}
              >
                {adding
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> Adding…</>
                  : <><ShoppingCart className="size-4" /> Buy now</>
                }
              </button>

              <button
                onClick={() => setWishlisted(w => !w)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border transition-all hover:bg-white/10"
                style={{
                  borderColor: wishlisted ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.35)',
                  color: wishlisted ? '#f87171' : '#fff',
                  background: wishlisted ? 'rgba(239,68,68,0.15)' : 'transparent',
                }}
              >
                <Heart className="size-4" style={{ fill: wishlisted ? '#ef4444' : 'transparent' }} />
                Add to favorite
              </button>
            </div>

            <button
              onClick={() => setShowDetails(d => !d)}
              className="mt-8 flex items-center gap-1 text-white/40 hover:text-white/70 text-xs font-medium transition-colors self-start"
            >
              <ChevronDown className={`size-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              {showDetails ? 'Hide details' : 'More details'}
            </button>
          </div>

          {/* Right panel — discover more */}
          <aside className="lg:w-[300px] shrink-0 flex flex-col gap-3 lg:pt-12">
            <div
              className="flex-1 rounded-2xl border p-3 space-y-2 overflow-y-auto max-h-[420px] lg:max-h-none scrollbar-none"
              style={{
                background: 'rgba(20, 16, 31, 0.75)',
                backdropFilter: 'blur(16px)',
                borderColor: 'rgba(139, 92, 246, 0.2)',
              }}
            >
              {relatedProducts.map(rel => (
                <RelatedGameCard key={rel.id} product={rel} />
              ))}
            </div>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--gs-accent), #6d28d9)' }}
            >
              Discover more <ChevronRight className="size-4" />
            </Link>
          </aside>
        </div>
      </section>

      {/* ══ DETAILS (expandable below hero) ════════════════════════════════ */}
      {showDetails && (
        <div className="border-t px-5 lg:px-8 py-8 space-y-6" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-bg)' }}>
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spec chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              {[
                { icon: CheckCircle2, label: 'Can be activated in', value: product.activationCountry ?? 'Vietnam & most countries', color: '#22c55e' },
                { icon: Globe, label: 'Region', value: product.region ?? 'GLOBAL', color: '#3b82f6' },
                { icon: Key, label: 'Type', value: product.type === 'random-key' ? 'Random Key' : 'Game Key', color: 'var(--gs-accent)' },
                { icon: Zap, label: 'Delivery', value: 'Instant — digital key', color: '#f59e0b' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="size-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{label}</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Steam live stats */}
            {product.steamAppId && (product.currentPlayers != null || product.isOnSale || product.ownersEstimate) && (
              <SteamStatsPanel product={product} liveLoading={liveLoading} livePricesAt={livePricesAt} />
            )}
          </div>

          {product.type === 'random-key' && (
            <div className="max-w-screen-xl mx-auto p-5 rounded-xl border" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--gs-text)' }}>
                <Gift className="size-4 text-amber-400" /> What could you get?
              </h2>
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {['Common ~60%', 'Rare ~30%', 'Epic ~10%'].map(t => (
                  <div key={t} className="p-3 rounded-xl text-center border" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface-2)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--gs-muted)' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div className="max-w-screen-xl mx-auto flex flex-wrap gap-3">
            {[
              { icon: Shield, label: 'Buyer Protection' },
              { icon: Zap, label: 'Instant Delivery' },
              { icon: Copy, label: 'Secure Payment' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium" style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)', background: 'var(--gs-surface)' }}>
                <Icon className="size-3.5" style={{ color: 'var(--gs-accent)' }} /> {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart toast */}
      {toast && (
        <Toast
          message="Added to cart!"
          sub={product.title}
          onCart={() => navigate('/cart')}
        />
      )}
    </div>
  );
}

function RelatedGameCard({ product }: { product: ProductItem }) {
  const pct = product.recommend ?? product.discount ?? 30;
  return (
    <Link
      to={`/product/${product.id}`}
      className="flex gap-3 p-2.5 rounded-xl transition-all hover:bg-white/5 group"
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {product.steamAppId ? (
          <SteamCoverImage steamAppId={product.steamAppId} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <ImageWithFallback src={product.image} alt={product.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition-colors">
            {product.title}
          </p>
          <Monitor className="size-3 shrink-0 text-white/30 mt-0.5" />
        </div>
        {product.discount != null && product.discount > 0 && (
          <p className="text-[10px] font-bold text-emerald-400 mt-0.5">-{product.discount}% OFF</p>
        )}
        <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--gs-accent)' }} />
        </div>
        <p className="text-[10px] mt-1 font-semibold text-white/50">
          ${product.price.toFixed(2)}
          {product.origPrice != null && (
            <span className="line-through ml-1 text-white/30">${product.origPrice.toFixed(2)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

function SteamStatsPanel({
  product,
  liveLoading,
  livePricesAt,
}: {
  product: ProductItem;
  liveLoading: boolean;
  livePricesAt: string | null;
}) {
  return (
    <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--gs-text)' }}>
        <Monitor className="size-4" style={{ color: 'var(--gs-accent)' }} />
        Steam live data
        {liveLoading && <span className="text-[10px] font-medium" style={{ color: 'var(--gs-faint)' }}>Updating…</span>}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {product.currentPlayers != null && (
          <div>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>Playing now</p>
            <p className="text-sm font-bold" style={{ color: 'var(--gs-text)' }}>{formatPlayerCount(product.currentPlayers)} online</p>
          </div>
        )}
        {product.ownersEstimate && (
          <div>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>Est. owners</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>{product.ownersEstimate}</p>
          </div>
        )}
        {product.isOnSale && (
          <div>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>Sale</p>
            <p className="text-sm font-bold text-red-400">On sale now</p>
          </div>
        )}
        {product.salePriceChangedAt && (
          <div className="col-span-2">
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>Price updated</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>
              {new Date(product.salePriceChangedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
      {livePricesAt && (
        <p className="text-[10px]" style={{ color: 'var(--gs-faint)' }}>
          Refreshed {new Date(livePricesAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

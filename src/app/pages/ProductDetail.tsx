import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Star, ShoppingCart, Heart, ChevronRight, Shield,
  Globe, Key, Monitor, CheckCircle2, Zap, Gift,
  Copy, AlertTriangle, Users, ChevronDown, PlayCircle,
  MessageSquare, ThumbsUp, ThumbsDown, ExternalLink, UserRound,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { SteamCoverImage } from '../components/SteamCoverImage';
import { getUser, apiAddToCart, apiGetSteamMedia, apiGetSteamReviews, type SteamMediaAPI, type SteamReviewAPI, type SteamReviewSummaryAPI, type SteamReviewTypeAPI } from '../lib/api';
import { getProductById, ALL_PRODUCTS, type ProductItem } from '../lib/products';
import { applyLivePrices, useLiveCatalogPrices, formatPlayerCount } from '../lib/livePrices';
import { getProductScreenshots } from '../lib/steamImages';

// Star rating renderer
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

// Toast helper
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

// Main product detail page
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
  const [steamMedia, setSteamMedia] = useState<SteamMediaAPI | null>(null);
  const [steamMediaLoading, setSteamMediaLoading] = useState(false);
  const [selectedHeroMedia, setSelectedHeroMedia] = useState(0);

  useEffect(() => {
    if (!product?.steamAppId) {
      setSteamMedia(null);
      setSteamMediaLoading(false);
      return;
    }

    let cancelled = false;
    setSteamMediaLoading(true);
    apiGetSteamMedia(product.steamAppId)
      .then(data => {
        if (!cancelled) setSteamMedia(data);
      })
      .catch(err => {
        console.warn('[steamMedia] fetch failed:', err);
        if (!cancelled) setSteamMedia(null);
      })
      .finally(() => {
        if (!cancelled) setSteamMediaLoading(false);
      });

    return () => { cancelled = true; };
  }, [product?.steamAppId]);

  useEffect(() => {
    setSelectedHeroMedia(0);
  }, [product?.id, steamMedia?.appid]);

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
  const steamScreenshots = steamMedia?.screenshots ?? [];
  const heroMedia: HeroMediaItem[] = [
    ...(steamMedia?.trailers ?? [])
      .filter(trailer => trailer.webm || trailer.mp4)
      .map((trailer, idx) => ({
        id: `trailer-${trailer.id ?? idx}`,
        kind: 'video' as const,
        label: trailer.name || `Trailer ${idx + 1}`,
        thumbnail: trailer.thumbnail ?? heroImage,
        webm: trailer.webm,
        mp4: trailer.mp4,
      })),
    ...(steamScreenshots.length
      ? steamScreenshots
      : images.map((src, idx) => ({ id: idx, thumbnail: src, full: src }))
    ).map((shot, idx) => ({
      id: `screenshot-${shot.id ?? idx}`,
      kind: 'image' as const,
      label: `Screenshot ${idx + 1}`,
      thumbnail: shot.thumbnail ?? shot.full ?? heroImage,
      full: shot.full ?? shot.thumbnail ?? heroImage,
    })),
  ];
  const selectedHero = heroMedia[selectedHeroMedia] ?? heroMedia[0];

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
      {/* HERO - game launcher style */}
      <section
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100svh - var(--gs-topbar-height) - var(--gs-footer-height))' }}
      >
        <div className="absolute inset-0 bg-black">
          {selectedHero?.kind === 'video' ? (
            <video
              key={selectedHero.id}
              autoPlay
              muted
              loop
              playsInline
              poster={selectedHero.thumbnail || heroImage}
              className="w-full h-full object-cover object-center"
            >
              {selectedHero.webm && <source src={selectedHero.webm} type="video/webm" />}
              {selectedHero.mp4 && <source src={selectedHero.mp4} type="video/mp4" />}
            </video>
          ) : (
            <ImageWithFallback
              src={selectedHero?.full ?? selectedHero?.thumbnail ?? heroImage}
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a14]/95 via-[#0c0a14]/70 to-[#0c0a14]/30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a14] via-transparent to-[#0c0a14]/40 pointer-events-none" />
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
              {product.description ?? `${product.title} - ${product.platform}. Instant digital delivery, activate on ${product.game ?? 'Steam'}.`}
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
                    {liveLoading ? 'Updating live price...' : 'Live market price'}
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
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> Adding...</>
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

            <HeroMediaStrip
              items={heroMedia}
              selectedIndex={selectedHeroMedia}
              loading={steamMediaLoading}
              onSelect={setSelectedHeroMedia}
            />
          </div>
          {/* Right panel - discover more */}
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
      <SteamReviewsSection
        product={product}
        media={steamMedia}
        loading={steamMediaLoading}
      />
      {/* DETAILS - expandable below hero */}
      {showDetails && (
        <div className="border-t px-5 lg:px-8 py-8 space-y-6" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-bg)' }}>
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spec chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>
              {[
                { icon: CheckCircle2, label: 'Can be activated in', value: product.activationCountry ?? 'Vietnam & most countries', color: '#22c55e' },
                { icon: Globe, label: 'Region', value: product.region ?? 'GLOBAL', color: '#3b82f6' },
                ...(product.type === 'random-key'
                  ? [{ icon: Key, label: 'Type', value: 'Random Key', color: 'var(--gs-accent)' }]
                  : []),
                { icon: Zap, label: 'Delivery', value: 'Instant - digital key', color: '#f59e0b' },
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

type HeroMediaItem = {
  id: string;
  kind: 'video' | 'image';
  label: string;
  thumbnail: string;
  full?: string;
  webm?: string | null;
  mp4?: string | null;
};

function formatSteamCount(value: number | undefined | null): string {
  const n = value ?? 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatReviewerName(review: SteamReviewAPI): string {
  return review.authorPersonaName?.trim() || 'Steam player';
}

function SteamReviewerAvatar({ review }: { review: SteamReviewAPI }) {
  if (review.authorAvatarUrl) {
    return (
      <img
        src={review.authorAvatarUrl}
        alt={formatReviewerName(review)}
        className="size-11 shrink-0 rounded-xl border border-neutral-200 object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400" aria-hidden="true">
      <UserRound className="size-5" />
    </div>
  );
}
function SteamSentimentBar({
  positivePercent,
  totalPositive,
  totalNegative,
}: {
  positivePercent: number | undefined | null;
  totalPositive: number;
  totalNegative: number;
}) {
  const safePercent = Math.max(0, Math.min(100, positivePercent ?? 0));

  return (
    <div className="space-y-4">
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-neutral-900" style={{ width: `${safePercent}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-500">
          <span className="block text-sm font-semibold text-neutral-900">{formatSteamCount(totalPositive)}</span>
          recommended
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-neutral-500">
          <span className="block text-sm font-semibold text-neutral-900">{formatSteamCount(totalNegative)}</span>
          not recommended
        </div>
      </div>
    </div>
  );
}
function SteamReviewCard({ review, index }: { review: SteamReviewAPI; index: number }) {
  const reviewer = formatReviewerName(review);
  const created = review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : 'Steam review';
  const playtime = review.playtimeHours != null ? `${review.playtimeHours}h played` : review.language ?? 'Steam';
  const profileContent = (
    <>
      <SteamReviewerAvatar review={review} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="truncate text-sm font-semibold tracking-tight text-neutral-900">{reviewer}</p>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            {review.votedUp ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
            {review.votedUp ? 'Recommended' : 'Not recommended'}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
          <span>{playtime}</span>
          <span>{created}</span>
          <span>{review.votesUp} helpful</span>
        </div>
      </div>
    </>
  );

  return (
    <article className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 sm:p-5 ${index === 0 ? 'xl:col-span-2' : ''}`}>
      {review.authorProfileUrl ? (
        <a href={review.authorProfileUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3">
          {profileContent}
        </a>
      ) : (
        <div className="flex items-start gap-3">{profileContent}</div>
      )}

      <p className={`mt-4 max-w-[78ch] whitespace-pre-line text-sm leading-6 text-neutral-600 ${index === 0 ? 'sm:text-[15px] sm:leading-7' : ''}`}>
        {review.review}
      </p>
    </article>
  );
}
function HeroMediaStrip({
  items,
  selectedIndex,
  loading,
  onSelect,
}: {
  items: HeroMediaItem[];
  selectedIndex: number;
  loading: boolean;
  onSelect: (index: number) => void;
}) {
  if (!items.length && !loading) return null;

  return (
    <div className="mt-6 w-full max-w-4xl">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {loading && (
          <div className="h-16 min-w-28 rounded-lg border flex items-center justify-center text-[10px] font-semibold text-white/60"
            style={{ borderColor: 'rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)' }}>
            Loading Steam media...
          </div>
        )}
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(idx)}
            className="relative h-16 min-w-28 overflow-hidden rounded-lg border transition-all hover:brightness-110"
            style={{
              borderColor: idx === selectedIndex ? 'var(--gs-accent)' : 'rgba(255,255,255,0.18)',
              boxShadow: idx === selectedIndex ? '0 0 0 2px rgba(139,92,246,0.35)' : 'none',
            }}
            aria-label={`Show ${item.label}`}
          >
            <ImageWithFallback src={item.thumbnail} alt={item.label} className="w-full h-full object-cover" />
            {item.kind === 'video' && (
              <span className="absolute inset-0 grid place-items-center bg-black/25">
                <PlayCircle className="size-7 text-white drop-shadow" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SteamReviewsSection({
  product,
  media,
  loading,
}: {
  product: ProductItem;
  media: SteamMediaAPI | null;
  loading: boolean;
}) {
  const [reviewType, setReviewType] = useState<SteamReviewTypeAPI>('all');
  const [reviewLanguage, setReviewLanguage] = useState('all');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest');
  const [reviews, setReviews] = useState<SteamReviewAPI[]>([]);
  const [summary, setSummary] = useState<SteamReviewSummaryAPI | null>(media?.reviewSummary ?? null);
  const [allSummary, setAllSummary] = useState<SteamReviewSummaryAPI | null>(media?.reviewSummary ?? null);
  const [nextCursor, setNextCursor] = useState<string | null>(media?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(Boolean(media?.hasMoreReviews));
  const [pageLoading, setPageLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const steamUrl = media?.steamUrl ?? (product.steamAppId ? `https://store.steampowered.com/app/${product.steamAppId}` : null);
  const baseSummary = allSummary ?? summary ?? media?.reviewSummary;
  const totalReviews = baseSummary?.totalReviews ?? product.reviews ?? 0;
  const totalPositive = baseSummary?.totalPositive ?? 0;
  const totalNegative = baseSummary?.totalNegative ?? 0;
  const positivePercent = baseSummary && baseSummary.totalReviews > 0
    ? Math.round((baseSummary.totalPositive / baseSummary.totalReviews) * 100)
    : product.recommend;
  const filters = [
    { id: 'all' as const, label: 'All', count: totalReviews },
    { id: 'positive' as const, label: 'Recommended', count: totalPositive },
    { id: 'negative' as const, label: 'Not recommended', count: totalNegative },
  ];
  const languageOptions = [
    { id: 'all', label: 'All languages' },
    { id: 'english', label: 'English' },
    { id: 'vietnamese', label: 'Vietnamese' },
    { id: 'schinese', label: 'Simplified Chinese' },
    { id: 'spanish', label: 'Spanish' },
    { id: 'french', label: 'French' },
    { id: 'german', label: 'German' },
    { id: 'russian', label: 'Russian' },
    { id: 'japanese', label: 'Japanese' },
    { id: 'koreana', label: 'Korean' },
  ];
  const dateOptions = [
    { id: 'newest' as const, label: 'Newest' },
    { id: 'oldest' as const, label: 'Oldest' },
  ];
  const selectedLanguage = languageOptions.find(language => language.id === reviewLanguage) ?? languageOptions[0];
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [reviews, dateOrder]);

  async function loadSteamReviews(reset: boolean) {
    if (!product.steamAppId) return;
    const cursor = reset ? '*' : nextCursor;
    if (!reset && !cursor) return;

    if (reset) {
      setPageLoading(true);
      setReviews([]);
    } else {
      setLoadingMore(true);
    }
    setReviewError(null);

    try {
      const page = await apiGetSteamReviews(product.steamAppId, {
        cursor: cursor ?? '*',
        filter: 'recent',
        reviewType,
        language: reviewLanguage,
        purchaseType: 'all',
        pageSize: 20,
      });
      setSummary(page.reviewSummary);
      if (reviewType === 'all') setAllSummary(page.reviewSummary);
      setNextCursor(page.nextCursor ?? null);
      setHasMore(page.hasMore);
      setReviews(prev => reset ? page.reviews : [...prev, ...page.reviews]);
    } catch (err) {
      console.warn('[steamReviews] fetch failed:', err);
      setReviewError('Could not load Steam reviews right now.');
      if (reset) {
        setSummary(media?.reviewSummary ?? null);
        setAllSummary(media?.reviewSummary ?? null);
        setReviews(media?.reviews ?? []);
        setNextCursor(media?.nextCursor ?? null);
        setHasMore(Boolean(media?.hasMoreReviews));
      }
    } finally {
      setPageLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setSummary(media?.reviewSummary ?? null);
    setAllSummary(media?.reviewSummary ?? null);
    setReviews(media?.reviews ?? []);
    setNextCursor(media?.nextCursor ?? null);
    setHasMore(Boolean(media?.hasMoreReviews));
  }, [media?.appid]);

  useEffect(() => {
    loadSteamReviews(true);
  }, [product.steamAppId, reviewType, reviewLanguage]);

  return (
    <section className="relative border-t border-neutral-200 bg-neutral-50 px-4 py-12 sm:px-6 lg:px-10 lg:py-14 [font-family:'Poppins',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .steam-review-scroll::-webkit-scrollbar { width: 10px; }
        .steam-review-scroll::-webkit-scrollbar-track { background: transparent; }
        .steam-review-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 999px; border: 3px solid transparent; background-clip: content-box; }
        .steam-review-scroll::-webkit-scrollbar-thumb:hover { background: #a3a3a3; border: 3px solid transparent; background-clip: content-box; }
      `}</style>
      <div className="mx-auto grid w-full max-w-[1840px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Player sentiment</p>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              <MessageSquare className="size-6 text-neutral-400" />
              Steam reviews
            </h2>
            <p className="max-w-md text-sm leading-6 text-neutral-500">
              Live player comments for {product.title}. Filter the review stream before opening the full Steam page.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Overall</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                  {positivePercent ?? product.recommend ?? 90}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tracking-tight text-neutral-900">{baseSummary?.reviewScoreDesc ?? 'Steam reviews'}</p>
                <p className="mt-1 text-xs text-neutral-400">{formatSteamCount(totalReviews)} total</p>
              </div>
            </div>

            <div className="mt-5">
              <SteamSentimentBar positivePercent={positivePercent} totalPositive={totalPositive} totalNegative={totalNegative} />
            </div>

            <div className="mt-6 space-y-2">
              {filters.map(filter => {
                const active = reviewType === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setReviewType(filter.id)}
                    aria-pressed={active}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition active:scale-[0.98]"
                    style={{
                      background: active ? '#171717' : '#fafafa',
                      borderColor: active ? '#171717' : '#e5e5e5',
                      color: active ? '#ffffff' : '#525252',
                    }}
                  >
                    <span>{filter.label}</span>
                    <span style={{ color: active ? '#d4d4d4' : '#a3a3a3' }}>{formatSteamCount(filter.count)}</span>
                  </button>
                );
              })}
            </div>

            {steamUrl && (
              <a
                href={steamUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]"
              >
                Open on Steam <ExternalLink className="size-3.5 text-neutral-400" />
              </a>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLanguageMenuOpen(open => !open)}
                  aria-expanded={languageMenuOpen}
                  className="flex min-h-10 min-w-48 items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-neutral-900 transition hover:border-neutral-300 hover:bg-white active:scale-[0.98]"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Language</span>
                    <span className="truncate">{selectedLanguage.label}</span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 text-neutral-400 transition-transform ${languageMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {languageMenuOpen && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-64 animate-in fade-in zoom-in-95 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-2xl">
                    {languageOptions.map(language => {
                      const active = reviewLanguage === language.id;
                      return (
                        <button
                          key={language.id}
                          type="button"
                          onClick={() => {
                            setReviewLanguage(language.id);
                            setLanguageMenuOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-neutral-50 active:scale-[0.98]"
                          style={{ color: active ? '#171717' : '#525252' }}
                        >
                          <span>{language.label}</span>
                          {active && <CheckCircle2 className="size-4 text-neutral-900" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                {dateOptions.map(option => {
                  const active = dateOrder === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDateOrder(option.id)}
                      aria-pressed={active}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-white active:scale-[0.98]"
                      style={{
                        background: active ? '#171717' : 'transparent',
                        color: active ? '#ffffff' : '#737373',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="px-1 text-xs font-medium text-neutral-400">{sortedReviews.length} comments loaded</span>
          </div>

          {(loading || pageLoading) && (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-medium text-neutral-500 shadow-sm">
              Loading Steam reviews...
            </div>
          )}
          {reviewError && (
            <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-xs font-medium text-red-600 shadow-sm">
              {reviewError}
            </div>
          )}

          {sortedReviews.length ? (
            <div className="space-y-4 steam-review-scroll">
              <div className="grid gap-4 xl:grid-cols-2">
                {sortedReviews.map((review, index) => (
                  <SteamReviewCard key={review.id} review={review} index={index} />
                ))}
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => loadSteamReviews(false)}
                  disabled={loadingMore}
                  className="min-h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more...' : 'Load more reviews'}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-500 shadow-sm">
              {pageLoading
                ? 'Loading Steam reviews...'
                : product.steamAppId
                  ? 'No Steam reviews are available for this filter right now.'
                  : 'This product has no Steam App ID, so Steam reviews cannot be loaded.'}
            </div>
          )}
        </div>
      </div>
    </section>
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
        {liveLoading && <span className="text-[10px] font-medium" style={{ color: 'var(--gs-faint)' }}>Updating...</span>}
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

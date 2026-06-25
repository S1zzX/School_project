import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Star, ShoppingCart, Heart, ChevronRight, Shield, ShieldCheck,
  Globe, Key, Monitor, CheckCircle2, Zap, Gift,
  Copy, X, AlertTriangle, ThumbsUp,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getUser, apiAddToCart } from '../lib/api';
import { getProductById } from '../lib/products';

// ── Deterministic pseudo-random seeded on a product id string ────────────────
// Returns a float in [min, max] that is stable for the same id+salt combo.
function seededVal(id: string, salt: string, min: number, max: number): number {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  const t = ((h >>> 0) / 0xffffffff);   // 0–1
  return parseFloat((min + t * (max - min)).toFixed(1));
}

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

  const product = getProductById(id ?? '');

  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(false);
  const [plan, setPlan] = useState<'standard' | 'plus'>('standard');

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

  const images = product.screenshots?.length ? product.screenshots : [product.image];

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

  const plusPrice   = parseFloat((product.price * 0.9).toFixed(2));
  const plusSavings = parseFloat((product.price - plusPrice).toFixed(2));
  const activePrice = plan === 'plus' ? plusPrice : product.price;

  return (
    <div style={{ background: 'var(--gs-bg)', minHeight: '100vh' }}>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--gs-surface)', borderBottom: '1px solid var(--gs-border)' }}>
        <div className="max-w-screen-xl mx-auto px-6 py-2.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--gs-faint)' }}>
          <Link to="/" className="hover:text-gs-accent transition-colors" style={{ color: 'var(--gs-faint)' }}>Home</Link>
          <ChevronRight className="size-3" />
          <span>Gaming</span>
          <ChevronRight className="size-3" />
          <span>{product.type === 'random-key' ? 'Random Keys' : 'Hot Deals'}</span>
          <ChevronRight className="size-3" />
          <span className="truncate max-w-xs" style={{ color: 'var(--gs-text)' }}>{product.title}</span>
        </div>
      </div>

      {/* ── Sponsored banner ──────────────────────────────────────────────── */}
      {product.badge === 'SPONSORED' && (
        <div className="max-w-screen-xl mx-auto px-6 pt-4">
          <div
            className="relative w-full h-20 rounded-xl overflow-hidden flex items-center px-6"
            style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0a0a1a 60%, #1a0a00 100%)' }}
          >
            <ImageWithFallback
              src={product.image}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
            <div className="relative z-10 flex items-center gap-4">
              <span
                className="text-sm font-black px-4 py-1.5 rounded-lg"
                style={{ background: 'var(--gs-accent)', color: '#fff' }}
              >
                Bestseller
              </span>
              <div>
                <p className="text-white font-bold text-sm">{product.title}</p>
                <p className="text-white/50 text-xs">{product.platform} · {product.region}</p>
              </div>
            </div>
            <div className="absolute top-2 right-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              SPONSORED
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-6 py-6">

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black leading-tight" style={{ color: 'var(--gs-text)' }}>
              {product.title} ({product.platform.split(' · ')[0]}) - {product.platform.split(' · ')[1] ?? 'Key'} - GLOBAL
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <StarRating rating={product.rating ?? 5} />
              <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{product.rating?.toFixed(1)}</span>
              <span className="text-sm" style={{ color: 'var(--gs-faint)' }}>
                {product.reviews?.toLocaleString()} reviews
              </span>
              <span className="text-sm" style={{ color: 'var(--gs-faint)' }}>·</span>
              <span className="text-sm flex items-center gap-1" style={{ color: 'var(--gs-faint)' }}>
                <ThumbsUp className="size-3.5" />
                {product.recommend}% recommend
              </span>
            </div>
          </div>
          <button
            onClick={() => setWishlisted(w => !w)}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:scale-110"
            style={{
              borderColor: wishlisted ? 'rgba(239,68,68,0.5)' : 'var(--gs-border)',
              background: wishlisted ? 'rgba(239,68,68,0.1)' : 'var(--gs-surface)',
            }}
            title="Add to wishlist"
          >
            <Heart
              className="size-5"
              style={{
                fill: wishlisted ? '#ef4444' : 'transparent',
                stroke: wishlisted ? '#ef4444' : 'var(--gs-muted)',
              }}
            />
          </button>
        </div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_320px] gap-6 items-start">

          {/* ── Left: Image gallery ──────────────────────────────────────── */}
          <div className="lg:w-72 space-y-3">
            {/* Main image */}
            <div
              className="w-full aspect-square rounded-2xl overflow-hidden border"
              style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface-2)' }}
            >
              <ImageWithFallback
                src={images[activeImg]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className="w-16 h-12 rounded-lg overflow-hidden border-2 transition-all"
                    style={{
                      borderColor: i === activeImg ? 'var(--gs-accent)' : 'var(--gs-border)',
                    }}
                  >
                    <ImageWithFallback src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Platform badge */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#1b2838' }}
              >
                <Monitor className="size-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--gs-text)' }}>Platform: Steam</p>
                <a href="#" className="text-xs underline" style={{ color: 'var(--gs-accent)' }}>
                  Check activation guide
                </a>
              </div>
            </div>
          </div>

          {/* ── Middle: Product info ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Spec chips */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border"
              style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
            >
              {[
                {
                  icon: CheckCircle2,
                  label: 'Can be activated in',
                  value: product.activationCountry ?? 'Vietnam & most countries',
                  sub: 'Check country restrictions',
                  color: '#22c55e',
                },
                {
                  icon: Globe,
                  label: 'Region',
                  value: product.region ?? 'GLOBAL',
                  color: '#3b82f6',
                },
                {
                  icon: Key,
                  label: 'Type',
                  value: product.type === 'random-key' ? 'Random Key' : 'Game Key',
                  color: 'var(--gs-accent)',
                },
                {
                  icon: Zap,
                  label: 'Delivery',
                  value: 'Instant — digital key',
                  color: '#f59e0b',
                },
              ].map(({ icon: Icon, label, value, sub, color }) => (
                <div key={label} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    <Icon className="size-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{label}</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>{value}</p>
                    {sub && <a href="#" className="text-xs underline" style={{ color: 'var(--gs-accent)' }}>{sub}</a>}
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div
              className="p-5 rounded-xl border"
              style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
            >
              <h2 className="font-bold mb-3" style={{ color: 'var(--gs-text)', fontSize: '1rem' }}>About this product</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--gs-muted)' }}>
                {product.description}
              </p>
            </div>

            {/* Random key prize pool info */}
            {product.type === 'random-key' && (
              <div
                className="p-5 rounded-xl border"
                style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
              >
                <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--gs-text)', fontSize: '1rem' }}>
                  <Gift className="size-4" style={{ color: '#f59e0b' }} />
                  What could you get?
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { tier: 'Common', bg: 'var(--gs-surface-2)', border: 'var(--gs-border)', label: 'var(--gs-muted)',  chance: '~60%' },
                    { tier: 'Rare',   bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: '#d97706', chance: '~30%' },
                    { tier: 'Epic',   bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: '#ea580c', chance: '~10%' },
                  ].map(t => (
                    <div
                      key={t.tier}
                      className="flex flex-col items-center p-3 rounded-xl text-center"
                      style={{ background: t.bg, border: `1px solid ${t.border}` }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: t.label }}>{t.tier}</span>
                      <span className="text-lg font-black" style={{ color: 'var(--gs-text)' }}>{t.chance}</span>
                      <span className="text-[9px] mt-0.5" style={{ color: 'var(--gs-faint)' }}>probability</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--gs-faint)' }}>
                  ⚡ All keys are valid Steam keys. You will receive exactly 1 random game key after purchase.
                </p>
              </div>
            )}

            {/* Trust badges row */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, label: 'Buyer Protection' },
                { icon: Zap, label: 'Instant Delivery' },
                { icon: Copy, label: 'Secure Payment' },
                { icon: Gift, label: '24/7 Support' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium"
                  style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)', background: 'var(--gs-surface)' }}
                >
                  <Icon className="size-3.5 text-gs-accent" style={{ color: 'var(--gs-accent)' }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Pricing sidebar ───────────────────────────────────── */}
          <div className="space-y-3">

            {/* ── Pricing plan selector ── */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}>

              {/* Membership option */}
              <button
                onClick={() => setPlan('plus')}
                className="w-full text-left p-4 border-b transition-all"
                style={{
                  background: plan === 'plus' ? 'rgba(249,115,22,0.10)' : 'rgba(249,115,22,0.04)',
                  borderColor: plan === 'plus' ? 'rgba(249,115,22,0.4)' : 'var(--gs-border)',
                  outline: plan === 'plus' ? '2px solid rgba(249,115,22,0.35)' : 'none',
                  outlineOffset: '-2px',
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: 'var(--gs-accent)', color: '#fff' }}>
                    MEMBERSHIP
                  </span>
                  <span className="text-xs" style={{ color: 'var(--gs-faint)' }}>Earn Reward Points: 35</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black" style={{ color: 'var(--gs-text)' }}>
                      ${plusPrice.toFixed(2)} <span className="text-xs font-normal" style={{ color: 'var(--gs-faint)' }}>USD</span>
                    </p>
                    <p className="text-xs" style={{ color: '#22c55e' }}>Save ${plusSavings.toFixed(2)} with Membership</p>
                  </div>
                  {/* Custom radio dot */}
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{ borderColor: plan === 'plus' ? 'var(--gs-accent)' : 'var(--gs-border)' }}>
                    {plan === 'plus' && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--gs-accent)' }} />}
                  </span>
                </div>
              </button>

              {/* Standard option */}
              <button
                onClick={() => setPlan('standard')}
                className="w-full text-left p-4 border-b transition-all"
                style={{
                  background: plan === 'standard' ? 'rgba(168,85,247,0.06)' : 'transparent',
                  borderColor: plan === 'standard' ? 'rgba(168,85,247,0.35)' : 'var(--gs-border)',
                  outline: plan === 'standard' ? '2px solid rgba(168,85,247,0.3)' : 'none',
                  outlineOffset: '-2px',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--gs-text)' }}>
                      ${product.price.toFixed(2)} <span className="text-xs font-normal" style={{ color: 'var(--gs-faint)' }}>USD</span>
                    </p>
                    {product.origPrice && (
                      <p className="text-sm line-through mt-0.5" style={{ color: 'var(--gs-faint)' }}>
                        ${product.origPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{ borderColor: plan === 'standard' ? '#a855f7' : 'var(--gs-border)' }}>
                    {plan === 'standard' && <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#a855f7' }} />}
                  </span>
                </div>
              </button>

              {/* Actions */}
              <div className="p-4 space-y-3">
                <button
                  id="product-add-cart-btn"
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: 'var(--gs-accent)', color: '#fff', opacity: adding ? 0.7 : 1 }}
                >
                  {adding
                    ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" style={{ display: 'inline-block' }} /> Adding…</>
                    : <><ShoppingCart className="size-4" /> Add to cart — ${activePrice.toFixed(2)}</>
                  }
                </button>

                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: '#003087', color: '#fff' }}
                  onClick={() => !user && navigate('/login')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.79A.859.859 0 0 1 5.79 2h7.518c2.418 0 4.087.958 4.494 2.635.13.54.143 1.086.042 1.644l-.003.018v.503l.324.183a3.186 3.186 0 0 1 1.516 2.118c.238 1.272.017 2.666-.633 3.876-.793 1.46-2.048 2.16-3.944 2.16h-.277c-.625 0-1.209.417-1.35 1.01l-.025.103-.622 3.933-.028.144c-.14.594-.724 1.01-1.35 1.01H7.077z"/>
                  </svg>
                  PayPal
                </button>

                <p className="text-center text-xs" style={{ color: 'var(--gs-faint)' }}>
                  Total cost with payment fee:{' '}
                  <strong style={{ color: 'var(--gs-text)' }}>${(activePrice * 1.02).toFixed(2)} USD</strong>
                </p>
              </div>
            </div>

            {/* Seller card — Admin only */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
            >
              {/* Admin header banner */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(124,58,237,0.10))' }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5" style={{ color: 'var(--gs-accent)' }} />
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--gs-accent)' }}>
                    Official Seller
                  </span>
                </div>
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: 'var(--gs-accent)', color: '#fff' }}
                >
                  Admin
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* ── Seller identity row ── */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--gs-accent), #a855f7)', color: '#fff', boxShadow: '0 0 14px rgba(249,115,22,0.3)' }}
                  >
                    AD
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm" style={{ color: 'var(--gs-text)' }}>Admin</p>
                      <CheckCircle2 className="size-3.5 shrink-0" style={{ color: '#22c55e' }} />
                    </div>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--gs-faint)' }}>
                      Platform-verified seller
                    </p>
                  </div>
                </div>

                {/* ── Per-product seller stats ── */}
                {(() => {
                  const pid = product.id;

                  // Single aggregate score
                  const score = seededVal(pid, 'score', 4.3, 4.9);

                  // Positive rate
                  const posRate = (Math.round(seededVal(pid, 'pos', 910, 995)) / 10).toFixed(1);

                  // Star distribution — generate raw weights, then normalise so they always sum to 100
                  const rawW = [
                    seededVal(pid, 'd5', 58, 78),   // 5★ weight
                    seededVal(pid, 'd4', 12, 24),   // 4★
                    seededVal(pid, 'd3',  4, 10),   // 3★
                    seededVal(pid, 'd2',  1,  5),   // 2★
                    seededVal(pid, 'd1',  1,  3),   // 1★
                  ];
                  const totalW = rawW.reduce((a, b) => a + b, 0);
                  // floor each, then give remainder to 5★ so total is exactly 100
                  const dist = rawW.map(w => Math.floor((w / totalW) * 100));
                  dist[0] += 100 - dist.reduce((a, b) => a + b, 0);

                  // Category metrics
                  const delivery    = Math.round(seededVal(pid, 'deliv', 92, 100));
                  const activation  = Math.round(seededVal(pid, 'activ', 93, 100));
                  const asDescribed = Math.round(seededVal(pid, 'desc',  90,  99));

                  // Member since
                  const memberYear = 2019 + Math.floor(seededVal(pid, 'year', 0, 5));

                  // Star SVG helper
                  const S = ({ n, score: sc }: { n: number; score: number }) => {
                    const fill = n <= Math.floor(sc) ? '#f59e0b'
                      : (n === Math.ceil(sc) && sc % 1 >= 0.35) ? '#f59e0b88'
                      : 'transparent';
                    return <svg width="12" height="12" viewBox="0 0 24 24" fill={fill} stroke="#f59e0b" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
                  };

                  // Bar colour per star tier
                  const barColor = (tier: number) =>
                    tier >= 4 ? '#f59e0b' : tier === 3 ? '#64748b' : '#f87171';

                  return (
                    <>
                      {/* ─── Top: score + histogram ─── */}
                      <div className="flex items-start gap-3">

                        {/* Big score block */}
                        <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                          <span className="text-4xl font-black leading-none tabular-nums" style={{ color: 'var(--gs-text)' }}>
                            {score.toFixed(1)}
                          </span>
                          <span className="flex gap-0.5">
                            {[1,2,3,4,5].map(n => <S key={n} n={n} score={score} />)}
                          </span>
                          <span className="text-[9px] leading-tight text-center" style={{ color: 'var(--gs-faint)' }}>
                            {(product.reviews ?? 0).toLocaleString()} reviews
                          </span>
                        </div>

                        {/* Histogram */}
                        <div className="flex-1 space-y-[5px] pt-0.5">
                          {dist.map((pct, i) => {
                            const tier = 5 - i;
                            return (
                              <div key={tier} className="flex items-center gap-1.5">
                                <span className="text-[9px] w-2.5 text-right tabular-nums shrink-0" style={{ color: 'var(--gs-faint)' }}>{tier}</span>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill={barColor(tier)} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--gs-surface-2)' }}>
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${Math.max(pct, 1)}%`, background: barColor(tier), opacity: tier >= 4 ? 1 : 0.55 }} />
                                </div>
                                <span className="text-[9px] w-6 text-right tabular-nums shrink-0" style={{ color: 'var(--gs-faint)' }}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ─── Stat chips row ─── */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
                          {posRate}% positive
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: 'var(--gs-surface-2)', border: '1px solid var(--gs-border)', color: 'var(--gs-muted)' }}>
                          {product.sellerSales} sales
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: 'var(--gs-surface-2)', border: '1px solid var(--gs-border)', color: 'var(--gs-muted)' }}>
                          Since {memberYear}
                        </span>
                      </div>

                      {/* ─── Category breakdown ─── */}
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--gs-border)' }}>
                        {[
                          { label: 'Key delivery speed', pct: delivery   },
                          { label: 'Activation success', pct: activation },
                          { label: 'As described',       pct: asDescribed },
                        ].map(({ label, pct }, i, arr) => (
                          <div key={label}
                            className={`flex items-center gap-3 px-3 py-2.5 ${i < arr.length - 1 ? 'border-b' : ''}`}
                            style={{ background: 'var(--gs-surface-2)', borderColor: 'var(--gs-border)' }}>
                            <p className="text-[10px] flex-1" style={{ color: 'var(--gs-faint)' }}>{label}</p>
                            <div className="w-20 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--gs-border)' }}>
                              <div className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: pct >= 97 ? '#22c55e' : '#f59e0b' }} />
                            </div>
                            <span className="text-[10px] font-bold tabular-nums w-8 text-right shrink-0"
                              style={{ color: pct >= 97 ? '#22c55e' : 'var(--gs-text)' }}>
                              {pct}%
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* ─── Guarantee ─── */}
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle2 className="size-3.5 shrink-0" style={{ color: '#16a34a' }} />
                        <p className="text-[10px] leading-snug" style={{ color: '#16a34a' }}>
                          Guaranteed delivery or full refund on every order.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Discount badge (hot deals) */}
            {product.discount && (
              <div
                className="rounded-xl p-3 flex items-center gap-3 border"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ef4444' }}>
                  <span className="text-xs font-black text-white">-{product.discount}%</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Limited time deal!</p>
                  <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
                    Save ${(product.origPrice! - product.price).toFixed(2)} off the original price
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

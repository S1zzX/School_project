import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ShoppingBag, Key, Copy, CheckCircle2, ChevronDown, ChevronUp,
  CreditCard, Zap, Gift, Shield, Search, LogIn, PackageOpen,
  ExternalLink, Clock,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getUser } from '../lib/api';
import { loadPurchaseHistory, PurchaseOrder } from '../lib/purchaseHistory';

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  card:   CreditCard,
  crypto: Zap,
  gift:   Gift,
};
const PAYMENT_LABELS: Record<string, string> = {
  card:   'Credit / Debit Card',
  crypto: 'Crypto (USDT/ETH)',
  gift:   'Gift Card',
};

// ── Helper: relative date ────────────────────────────────────────────────────
function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7)   return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Key copy button ──────────────────────────────────────────────────────────
function KeyCopy({ steamKey }: { steamKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(steamKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <code
        onClick={copy}
        title="Click to copy"
        className="font-mono text-sm tracking-widest cursor-pointer px-3 py-1.5 rounded-lg select-all transition-all hover:opacity-80"
        style={{
          background: 'var(--gs-surface-dark, #050508)',
          border: '1px solid var(--gs-accent)',
          color: 'var(--gs-accent)',
          letterSpacing: '0.15em',
          fontSize: '0.85rem',
          fontWeight: 700,
        }}
      >
        {steamKey}
      </code>
      <button
        onClick={copy}
        title="Copy key"
        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:opacity-80 shrink-0"
        style={{
          borderColor: copied ? 'rgba(34,197,94,0.4)' : 'var(--gs-border)',
          background: copied ? 'rgba(34,197,94,0.1)' : 'var(--gs-surface-2)',
        }}
      >
        {copied
          ? <CheckCircle2 className="size-3.5 text-emerald-400" />
          : <Copy className="size-3.5" style={{ color: 'var(--gs-faint)' }} />
        }
      </button>
    </div>
  );
}

// ── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: PurchaseOrder }) {
  const [expanded, setExpanded] = useState(false);
  const PayIcon = PAYMENT_ICONS[order.paymentMethod] ?? CreditCard;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-shadow hover:shadow-lg"
      style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
    >
      {/* Order header */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gs-surface-2"
        onClick={() => setExpanded(e => !e)}
        style={{ background: expanded ? 'var(--gs-surface-2)' : 'transparent' }}
      >
        {/* Status badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <CheckCircle2 className="size-5 text-emerald-400" />
        </div>

        {/* Order meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm" style={{ color: 'var(--gs-text)' }}>
              Order #{order.orderId}
            </span>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              Completed
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--gs-faint)' }}>
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {relativeDate(order.purchasedAt)}
            </span>
            <span>·</span>
            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <PayIcon className="size-3" /> {PAYMENT_LABELS[order.paymentMethod] ?? 'Card'}
            </span>
          </div>
        </div>

        {/* Price + expand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-black text-sm" style={{ color: 'var(--gs-text)' }}>
              ${order.total.toFixed(2)}
            </p>
            {order.promoApplied && (
              <p className="text-[10px]" style={{ color: '#22c55e' }}>GAME10 applied</p>
            )}
          </div>
          {expanded
            ? <ChevronUp className="size-4" style={{ color: 'var(--gs-faint)' }} />
            : <ChevronDown className="size-4" style={{ color: 'var(--gs-faint)' }} />
          }
        </div>
      </button>

      {/* Expandable items */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'var(--gs-border)' }}>
          {/* Date full */}
          <div
            className="px-5 py-2 text-xs flex items-center gap-2"
            style={{ background: 'var(--gs-surface-2)', color: 'var(--gs-faint)' }}
          >
            <Clock className="size-3" />
            {new Date(order.purchasedAt).toLocaleString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short',
              day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--gs-border)' }}>
            {order.items.map((item, idx) => (
              <div key={idx} className="px-5 py-4 flex gap-4 items-start">
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--gs-text)' }}>
                      {item.name}
                    </p>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
                      style={{ background: 'var(--gs-surface-2)', color: 'var(--gs-muted)', border: '1px solid var(--gs-border)' }}
                    >
                      {item.platform.split(' · ')[1] ?? 'Key'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{item.platform}</p>

                  {/* Steam key */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--gs-muted)' }}>
                      <Key className="size-3" /> Product Key:
                    </span>
                    <KeyCopy steamKey={item.key} />
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm" style={{ color: 'var(--gs-accent)' }}>
                    ${item.price.toFixed(2)}
                  </p>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <p className="text-xs line-through" style={{ color: 'var(--gs-faint)' }}>
                      ${item.originalPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Order footer */}
          <div
            className="px-5 py-3 flex items-center justify-between border-t"
            style={{ background: 'var(--gs-surface-2)', borderColor: 'var(--gs-border)' }}
          >
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--gs-faint)' }}>
              <Shield className="size-3.5" />
              <span>Buyer Protected · Instant Key Delivery</span>
            </div>
            <p className="text-sm font-black" style={{ color: 'var(--gs-text)' }}>
              Total: <span style={{ color: 'var(--gs-accent)' }}>${order.total.toFixed(2)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Purchase History page ───────────────────────────────────────────────
export function PurchaseHistory() {
  const user = getUser();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');

  useEffect(() => {
    if (!user) return;
    setOrders(loadPurchaseHistory(user.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build month options
  const months = Array.from(
    new Set(orders.map(o => o.purchasedAt.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const filtered = orders.filter(o => {
    const matchSearch =
      !search ||
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchMonth = filterMonth === 'all' || o.purchasedAt.startsWith(filterMonth);
    return matchSearch && matchMonth;
  });

  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const totalKeys  = orders.reduce((s, o) => s + o.items.length, 0);

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 flex flex-col items-center gap-5 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'color-mix(in oklab, var(--gs-accent) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--gs-accent) 20%, transparent)' }}
        >
          <LogIn className="size-9 text-gs-accent opacity-70" />
        </div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--gs-text)' }}>Sign in to view history</h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--gs-faint)' }}>
          Your purchase history is tied to your account. Log in to see all your past orders and Steam keys.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: 'var(--gs-accent)', color: '#fff' }}
        >
          <LogIn className="size-4" /> Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-6" style={{ minHeight: '70vh' }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--gs-text)' }}>
            Purchase History
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--gs-faint)' }}>
            All your game key orders · signed in as{' '}
            <span style={{ color: 'var(--gs-accent)', fontWeight: 600 }}>{user.username}</span>
          </p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:border-gs-accent/50"
          style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)' }}
        >
          <ExternalLink className="size-4" /> Browse More Games
        </Link>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Orders',    value: orders.length,          icon: ShoppingBag, color: 'var(--gs-accent)' },
            { label: 'Keys Received',   value: totalKeys,              icon: Key,         color: '#a855f7' },
            { label: 'Total Spent',     value: `$${totalSpent.toFixed(2)}`, icon: CreditCard, color: '#22c55e' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}
              >
                <Icon className="size-5" style={{ color }} />
              </div>
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--gs-text)' }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      {orders.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border px-3 py-2"
            style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
          >
            <Search className="size-4 shrink-0" style={{ color: 'var(--gs-faint)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders or games…"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gs-faint"
              style={{ color: 'var(--gs-text)' }}
            />
          </div>
          {months.length > 1 && (
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--gs-surface)',
                borderColor: 'var(--gs-border)',
                color: 'var(--gs-text)',
              }}
            >
              <option value="all">All time</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleString('en-US', { year: 'numeric', month: 'long' })}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── Orders list ───────────────────────────────────────────────── */}
      {orders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'color-mix(in oklab, var(--gs-accent) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--gs-accent) 18%, transparent)' }}
          >
            <PackageOpen className="size-9" style={{ color: 'var(--gs-accent)', opacity: 0.7 }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--gs-text)' }}>No purchases yet</h2>
            <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--gs-faint)' }}>
              Browse our Random Keys and Hot Deals, add items to your cart, and checkout to see your orders here.
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--gs-accent)', color: '#fff' }}
          >
            <ShoppingBag className="size-4" /> Start Shopping
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        /* No results */
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Search className="size-10" style={{ color: 'var(--gs-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--gs-text)' }}>No orders match your search</p>
          <button
            onClick={() => { setSearch(''); setFilterMonth('all'); }}
            className="text-sm underline"
            style={{ color: 'var(--gs-accent)' }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} — click to expand and view your keys
          </p>
          {filtered.map(order => (
            <OrderCard key={order.orderId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

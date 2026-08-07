import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ShoppingBag, Key, Copy, CheckCircle2, ChevronDown, ChevronUp,
  CreditCard, Zap, Gift, Shield, Search, LogIn, PackageOpen,
  ExternalLink, Clock, Receipt, Wallet,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getUser } from '../lib/api';
import { loadPurchaseHistory, PurchaseOrder } from '../lib/purchaseHistory';

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  card:   CreditCard,
  crypto: Zap,
  gift:   Gift,
  wallet: Wallet,
};
const PAYMENT_LABELS: Record<string, string> = {
  card:   'Credit / Debit Card',
  crypto: 'Crypto (USDT/ETH)',
  gift:   'Gift Card',
  wallet: 'GameGuide Wallet',
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-gs-border bg-gs-surface-2 text-[10px] font-medium uppercase tracking-wide text-gs-muted">
      {children}
    </span>
  );
}

function StatStrip({ items }: { items: { label: string; value: string | number; icon: React.ReactNode }[] }) {
  return (
    <div className="commerce-stat-strip bg-gs-surface border border-gs-border rounded-2xl overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gs-border">
        {items.map((item, i) => (
          <div key={item.label} className="commerce-stat flex items-center gap-4 px-6 py-5" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="commerce-stat-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gs-text tabular-nums leading-none">{item.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-gs-faint font-bold mt-1.5">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
        className="font-mono text-xs tracking-wider cursor-pointer px-3 py-1.5 rounded-lg select-all bg-gs-surface-2 border border-gs-border text-gs-text hover:border-gs-accent/40 transition-colors"
      >
        {steamKey}
      </code>
      <button
        onClick={copy}
        title="Copy key"
        className={`w-8 h-8 flex items-center justify-center rounded-lg border shrink-0 transition-colors ${
          copied
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-gs-border bg-gs-surface-2 text-gs-faint hover:text-gs-muted'
        }`}
      >
        {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

function OrderCard({ order }: { order: PurchaseOrder }) {
  const [expanded, setExpanded] = useState(false);
  const PayIcon = PAYMENT_ICONS[order.paymentMethod] ?? CreditCard;

  return (
    <div className="commerce-order-card bg-gs-surface border border-gs-border rounded-2xl overflow-hidden">
      <button
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
          expanded ? 'bg-gs-surface-2' : 'hover:bg-gs-surface-2/60'
        }`}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-10 h-10 rounded-lg bg-gs-surface-2 border border-gs-border flex items-center justify-center shrink-0 text-gs-muted">
          <Receipt className="size-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm text-gs-text">
              Order #{order.orderId}
            </span>
            <Badge>Completed</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-gs-faint flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {relativeDate(order.purchasedAt)}
            </span>
            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <PayIcon className="size-3" /> {PAYMENT_LABELS[order.paymentMethod] ?? 'Card'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-bold text-sm text-gs-text tabular-nums">
              ${order.total.toFixed(2)}
            </p>
            {order.promoApplied && (
              <p className="text-[10px] text-gs-faint">GAME10 applied</p>
            )}
          </div>
          {expanded
            ? <ChevronUp className="size-4 text-gs-faint" />
            : <ChevronDown className="size-4 text-gs-faint" />
          }
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gs-border">
          <div className="px-5 py-2 text-xs flex items-center gap-2 bg-gs-surface-2 text-gs-faint">
            <Clock className="size-3" />
            {new Date(order.purchasedAt).toLocaleString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short',
              day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>

          <div className="divide-y divide-gs-border">
            {order.items.map((item, idx) => (
              <div key={idx} className="px-5 py-4 flex gap-4 items-start">
                <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-gs-border">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gs-text truncate">
                      {item.name}
                    </p>
                    <Badge>{item.platform.split(' · ')[1] ?? 'Key'}</Badge>
                  </div>
                  <p className="text-xs text-gs-faint">{item.platform}</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium flex items-center gap-1 text-gs-muted">
                      <Key className="size-3" /> Product Key
                    </span>
                    <KeyCopy steamKey={item.key} />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm text-gs-text tabular-nums">
                    ${item.price.toFixed(2)}
                  </p>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <p className="text-xs line-through text-gs-faint">
                      ${item.originalPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 flex items-center justify-between border-t border-gs-border bg-gs-surface-2">
            <div className="flex items-center gap-1.5 text-xs text-gs-faint">
              <Shield className="size-3.5" />
              <span>Buyer protected · instant key delivery</span>
            </div>
            <p className="text-sm font-semibold text-gs-text tabular-nums">
              Total: ${order.total.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const months = Array.from(
    new Set(orders.map((o) => o.purchasedAt.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchMonth = filterMonth === 'all' || o.purchasedAt.startsWith(filterMonth);
    return matchSearch && matchMonth;
  });

  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const totalKeys  = orders.reduce((s, o) => s + o.items.length, 0);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-xl bg-gs-surface-2 border border-gs-border flex items-center justify-center text-gs-muted">
          <LogIn className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-gs-text">Sign in to view history</h1>
        <p className="text-sm max-w-xs text-gs-faint">
          Your purchase history is tied to your account. Log in to see all your past orders and product keys.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity"
        >
          <LogIn className="size-4" /> Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="commerce-page purchase-history-page max-w-6xl mx-auto px-6 py-8 space-y-7 min-h-[70vh]">

      {/* Header */}
      <div className="commerce-hero flex items-center justify-between gap-4 flex-wrap rounded-3xl border px-6 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="commerce-hero-icon w-14 h-14 rounded-2xl flex items-center justify-center">
            <ShoppingBag className="size-5" />
          </div>
          <div>
            <p className="commerce-eyebrow">Your game library</p>
            <h1 className="text-2xl lg:text-3xl font-black text-gs-text tracking-tight">Purchase <span className="commerce-gradient-text">History</span></h1>
            <p className="text-sm text-gs-faint mt-0.5">
              All your game key orders · signed in as{' '}
              <span className="text-gs-text font-medium">{user.username}</span>
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gs-border text-gs-muted hover:text-gs-text hover:bg-gs-surface-2 transition-colors"
        >
          <ExternalLink className="size-4" /> Browse More Games
        </Link>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <StatStrip items={[
          { label: 'Total Orders', value: orders.length, icon: <ShoppingBag className="size-4" /> },
          { label: 'Keys Received', value: totalKeys, icon: <Key className="size-4" /> },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: <CreditCard className="size-4" /> },
        ]} />
      )}

      {/* Filters */}
      {orders.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-48 rounded-lg border border-gs-border bg-gs-surface px-3 py-2">
            <Search className="size-4 shrink-0 text-gs-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders or games…"
              className="flex-1 bg-transparent text-sm text-gs-text focus:outline-none placeholder:text-gs-faint"
            />
          </div>
          {months.length > 1 && (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-gs-border bg-gs-surface px-3 py-2 text-sm text-gs-text focus:outline-none"
            >
              <option value="all">All time</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleString('en-US', { year: 'numeric', month: 'long' })}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Orders */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center bg-gs-surface border border-gs-border rounded-xl">
          <div className="w-16 h-16 rounded-xl bg-gs-surface-2 border border-gs-border flex items-center justify-center text-gs-muted">
            <PackageOpen className="size-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gs-text">No purchases yet</h2>
            <p className="text-sm mt-1 max-w-xs text-gs-faint">
              Browse our Random Keys and Hot Deals, add items to your cart, and checkout to see your orders here.
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="size-4" /> Start Shopping
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Search className="size-10 text-gs-faint" />
          <p className="font-medium text-gs-text">No orders match your search</p>
          <button
            onClick={() => { setSearch(''); setFilterMonth('all'); }}
            className="text-sm text-gs-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gs-faint">
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} — click to expand and view your keys
          </p>
          {filtered.map((order) => (
            <OrderCard key={order.orderId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
